package com.phantom.CodeReviewer.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.RequiredArgsConstructor;
import org.kohsuke.github.GHAppInstallation;
import org.kohsuke.github.GHAppInstallationToken;
import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class GitHubService {

    @Value("${github.app.id}")
    private String appId;

    @Value("${github.app.private-key-path}")
    private String privateKeyPath;

    private final RestTemplate restTemplate;

    private String generateJWT() throws Exception {
        byte[] keyBytes = Files.readAllBytes(Paths.get(privateKeyPath));

        String keyString = new String(keyBytes, StandardCharsets.UTF_8)
                .replaceAll("-----BEGIN.*?-----", "")
                .replaceAll("-----END.*?-----", "")
                .replaceAll("\\s", "");

        byte[] decodedKey = Base64.getDecoder().decode(keyString);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decodedKey);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        PrivateKey privateKey = kf.generatePrivate(spec);

        long nowMillis = System.currentTimeMillis();
        Date iat = new Date(nowMillis - 40000L); // Clock skew safety (60s back)
        Date exp = new Date(nowMillis + 540000L); // 9 minutes expiry

        return Jwts.builder()
                .setIssuedAt(iat)
                .setExpiration(exp)
                .setIssuer(appId)
                .signWith(privateKey, SignatureAlgorithm.RS256)
                .compact();
    }

    private String getInstallationToken(long installationId) throws Exception {
        String jwt = generateJWT();

        GitHub gitHubApp = new GitHubBuilder().withJwtToken(jwt).build();
        // Direct O(1) lookup using installation ID for global multi-tenancy
        GHAppInstallation installation = gitHubApp.getApp().getInstallationById(installationId);

        GHAppInstallationToken token = installation.createToken().create();
        return token.getToken();
    }

    // Is method ko GitHubService class ke andar kahin bhi add kar do
    public void postCommentToPullRequest(long installationId, String repoFullName, Long prNumber, String commentBody) {
        try {
            // 1. Get the secure installation token
            String installationToken = getInstallationToken(installationId);

            // 2. GitHub API endpoint for PR comments
            String apiUrl = "https://api.github.com/repos/" + repoFullName + "/issues/" + prNumber + "/comments";

            // 3. Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + installationToken);
            headers.set("Accept", "application/vnd.github.v3+json");
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            // 4. Create JSON body {"body": "Markdown string"}
            java.util.Map<String, String> requestBody = new java.util.HashMap<>();
            requestBody.put("body", commentBody);

            HttpEntity<java.util.Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

            // 5. Post the comment
            restTemplate.postForEntity(apiUrl, entity, String.class);
            System.out.println("--> Successfully posted AI review to GitHub PR #" + prNumber + " in repo: " + repoFullName);

        } catch (Exception e) {
            System.err.println("Error posting comment to GitHub PR: " + e.getMessage());
        }
    }

    public String getPullRequestDiff(long installationId, String repoFullName, Long prNumber) {
        try {
            String installationToken = getInstallationToken(installationId);

            String apiUrl = "https://api.github.com/repos/" + repoFullName + "/pulls/" + prNumber;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + installationToken);
            headers.set("Accept", "application/vnd.github.v3.diff");

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);
            return response.getBody();

        } catch (Exception e) {
            System.err.println("Error fetching diff with GitHub App: " + e.getMessage());
            return null;
        }
    }

    /**
     * Fetch latest commit SHA for a repository branch
     */
    public String getLatestCommitSha(String repoFullName, String branch, String userAccessToken) {
        String targetBranch = (branch != null && !branch.isBlank()) ? branch.trim() : "main";
        String apiUrl = "https://api.github.com/repos/" + repoFullName + "/commits/" + targetBranch;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/vnd.github.v3+json");
            if (userAccessToken != null && !userAccessToken.isBlank()) {
                headers.set("Authorization", "Bearer " + userAccessToken);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<java.util.Map> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, java.util.Map.class);
            if (response.getBody() != null && response.getBody().containsKey("sha")) {
                return (String) response.getBody().get("sha");
            }
            throw new IllegalStateException("GitHub response did not contain a commit SHA for branch: " + targetBranch);
        } catch (org.springframework.web.client.HttpStatusCodeException httpEx) {
            if (httpEx.getStatusCode().value() == 401 && userAccessToken != null && !userAccessToken.isBlank()) {
                System.out.println("--> [GITHUB-API] User token 401 Unauthorized for latest commit on " + repoFullName + ". Retrying as public request...");
                try {
                    HttpHeaders publicHeaders = new HttpHeaders();
                    publicHeaders.set("Accept", "application/vnd.github.v3+json");
                    HttpEntity<Void> publicEntity = new HttpEntity<>(publicHeaders);
                    ResponseEntity<java.util.Map> publicResponse = restTemplate.exchange(apiUrl, HttpMethod.GET, publicEntity, java.util.Map.class);
                    if (publicResponse.getBody() != null && publicResponse.getBody().containsKey("sha")) {
                        return (String) publicResponse.getBody().get("sha");
                    }
                } catch (Exception retryEx) {
                    System.err.println("Failed to fetch public latest commit SHA for " + repoFullName + ": " + retryEx.getMessage());
                }
            }
            System.err.println("Failed to fetch latest commit SHA for " + repoFullName + " on branch " + targetBranch + ": " + httpEx.getMessage());
            throw new IllegalStateException("Failed to fetch commit SHA from GitHub for " + repoFullName + " (" + targetBranch + "): " + httpEx.getMessage(), httpEx);
        } catch (Exception e) {
            System.err.println("Failed to fetch latest commit SHA for " + repoFullName + " on branch " + targetBranch + ": " + e.getMessage());
            throw new IllegalStateException("Failed to fetch commit SHA from GitHub for " + repoFullName + " (" + targetBranch + "): " + e.getMessage(), e);
        }
    }

    /**
     * Fetch recursive Git tree for a repository to build the abstract repository tree
     */
    public java.util.List<java.util.Map<String, Object>> getRepositoryTree(String repoFullName, String commitSha, String userAccessToken) {
        String apiUrl = "https://api.github.com/repos/" + repoFullName + "/git/trees/" + commitSha + "?recursive=1";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/vnd.github.v3+json");
            if (userAccessToken != null && !userAccessToken.isBlank()) {
                headers.set("Authorization", "Bearer " + userAccessToken);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<java.util.Map> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, java.util.Map.class);
            if (response.getBody() != null && response.getBody().containsKey("tree")) {
                return (java.util.List<java.util.Map<String, Object>>) response.getBody().get("tree");
            }
        } catch (org.springframework.web.client.HttpStatusCodeException httpEx) {
            if (httpEx.getStatusCode().value() == 401 && userAccessToken != null && !userAccessToken.isBlank()) {
                System.out.println("--> [GITHUB-API] User token 401 Unauthorized for repository tree " + repoFullName + ". Retrying as public request...");
                try {
                    HttpHeaders publicHeaders = new HttpHeaders();
                    publicHeaders.set("Accept", "application/vnd.github.v3+json");
                    HttpEntity<Void> publicEntity = new HttpEntity<>(publicHeaders);
                    ResponseEntity<java.util.Map> publicResponse = restTemplate.exchange(apiUrl, HttpMethod.GET, publicEntity, java.util.Map.class);
                    if (publicResponse.getBody() != null && publicResponse.getBody().containsKey("tree")) {
                        return (java.util.List<java.util.Map<String, Object>>) publicResponse.getBody().get("tree");
                    }
                } catch (Exception retryEx) {
                    System.err.println("Error fetching public repository tree for " + repoFullName + ": " + retryEx.getMessage());
                }
            } else {
                System.err.println("Error fetching repository tree for " + repoFullName + ": " + httpEx.getMessage());
            }
        } catch (Exception e) {
            System.err.println("Error fetching repository tree for " + repoFullName + ": " + e.getMessage());
        }
        return java.util.Collections.emptyList();
    }

    /**
     * Fetch raw file content for a specific file at commit SHA
     */
    public String getFileContent(String repoFullName, String filePath, String commitSha, String userAccessToken) {
        String apiUrl = "https://api.github.com/repos/" + repoFullName + "/contents/" + filePath + "?ref=" + commitSha;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Accept", "application/vnd.github.v3.raw");
            if (userAccessToken != null && !userAccessToken.isBlank()) {
                headers.set("Authorization", "Bearer " + userAccessToken);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (org.springframework.web.client.HttpStatusCodeException httpEx) {
            // If token returned 401 Bad Credentials, fallback to unauthenticated request (works for public repos)
            if (httpEx.getStatusCode().value() == 401 && userAccessToken != null && !userAccessToken.isBlank()) {
                System.out.println("--> [GITHUB-API] User token 401 Unauthorized for " + filePath + ". Retrying as public repository request...");
                try {
                    HttpHeaders publicHeaders = new HttpHeaders();
                    publicHeaders.set("Accept", "application/vnd.github.v3.raw");
                    HttpEntity<Void> publicEntity = new HttpEntity<>(publicHeaders);
                    ResponseEntity<String> publicResponse = restTemplate.exchange(apiUrl, HttpMethod.GET, publicEntity, String.class);
                    return publicResponse.getBody();
                } catch (Exception retryEx) {
                    System.err.println("Error fetching public file content for " + filePath + ": " + retryEx.getMessage());
                }
            } else {
                System.err.println("Error fetching file content for " + filePath + ": " + httpEx.getMessage());
            }
            return null;
        } catch (Exception e) {
            System.err.println("Error fetching file content for " + filePath + ": " + e.getMessage());
            return null;
        }
    }
}
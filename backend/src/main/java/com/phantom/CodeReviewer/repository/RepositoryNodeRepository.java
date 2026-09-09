package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.RepositoryNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RepositoryNodeRepository extends JpaRepository<RepositoryNode, Long> {
    List<RepositoryNode> findByRepositoryIdOrderByPathAsc(Long repositoryId);
    List<RepositoryNode> findByRepositoryIdAndNodeTypeOrderByPathAsc(Long repositoryId, String nodeType);
    Optional<RepositoryNode> findByRepositoryIdAndPath(Long repositoryId, String path);
    void deleteByRepositoryId(Long repositoryId);
}

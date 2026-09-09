package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.ConnectedRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectedRepositoryRepository extends JpaRepository<ConnectedRepository, Long> {
    List<ConnectedRepository> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<ConnectedRepository> findByUserIdAndFullName(String userId, String fullName);
    boolean existsByUserIdAndFullName(String userId, String fullName);
}

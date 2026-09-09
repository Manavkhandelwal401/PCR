package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.CodeDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CodeDependencyRepository extends JpaRepository<CodeDependency, Long> {
    List<CodeDependency> findBySourceNodeId(Long sourceNodeId);
    List<CodeDependency> findByTargetNodeId(Long targetNodeId);
    List<CodeDependency> findByRepositoryId(Long repositoryId);
    void deleteBySourceNodeId(Long sourceNodeId);
    void deleteByRepositoryId(Long repositoryId);
}

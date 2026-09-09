package com.phantom.CodeReviewer.repository;

import com.phantom.CodeReviewer.entity.CodeSymbol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CodeSymbolRepository extends JpaRepository<CodeSymbol, Long> {
    List<CodeSymbol> findByNodeId(Long nodeId);
    List<CodeSymbol> findByRepositoryId(Long repositoryId);
    void deleteByNodeId(Long nodeId);
    void deleteByRepositoryId(Long repositoryId);
}

export interface SearchFilters {
  codigo: string;
  descricao: string;
  fornecedor: string;
  situacao: string;
}

export const parseSearchQueryWithGemini = async (query: string): Promise<SearchFilters> => {
  if (!query || !query.trim()) {
    return { codigo: '', descricao: '', fornecedor: '', situacao: '' };
  }

  try {
    const res = await fetch('/api/ai/parse-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.filters) {
        return {
          codigo: data.filters.codigo || '',
          descricao: data.filters.descricao || '',
          fornecedor: data.filters.fornecedor || '',
          situacao: data.filters.situacao || ''
        };
      }
    }
  } catch (err) {
    console.warn("Falha na chamada à IA do servidor, usando fallback:", err);
  }

  return { codigo: '', descricao: query, fornecedor: '', situacao: '' };
};

import { GoogleGenAI, Type } from "@google/genai";

// Inicialização tardia (lazy) para evitar quebrar se a chave estiver faltando no carregamento do módulo
let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada. Por favor, verifique as configurações.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export interface SearchFilters {
  codigo: string;
  descricao: string;
  fornecedor: string;
  situacao: string;
}

export const parseSearchQueryWithGemini = async (query: string): Promise<SearchFilters> => {
  const ai = getGenAI();

  const prompt = `Analise a seguinte busca de produtos de uma distribuidora de doces e salgadinhos (Marsil Boracéia) e extraia os filtros necessários no formato JSON.
  A busca do usuário é: "${query}"

  Extraia:
  1. codigo: Apenas se o usuário citar um código numérico específico (ex: "item 1234").
  2. descricao: O termo principal de busca (ex: "Snickers", "Bolacha", "Chocolate").
  3. fornecedor: O nome da marca ou fabricante se citado (ex: "Mars", "Nestle", "Bauducco").
  4. situacao: A sigla da situação se identificada:
     - PR (Promoção/Liquidacao)
     - NO (Normal/Regular)
     - EX (Preço Externo)
     - DV (Validade Curta/Vencendo)
     - FT (Falta Temporária)
     - PC (Proibida a Compra)

  Se não encontrar um filtro, deixe como string vazia.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            codigo: { type: Type.STRING },
            descricao: { type: Type.STRING },
            fornecedor: { type: Type.STRING },
            situacao: { type: Type.STRING },
          },
          required: ["codigo", "descricao", "fornecedor", "situacao"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia da IA");
    
    return JSON.parse(text) as SearchFilters;
  } catch (error) {
    console.error("Erro ao processar consulta com Gemini:", error);
    throw error;
  }
};

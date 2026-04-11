/**
 * Dicionario de correcao ortografica PT-BR para o ERP Eixo Global.
 *
 * Fornece correcoes INSTANTANEAS offline sem chamadas a APIs de IA.
 * Todas as buscas sao case-insensitive. A capitalizacao original e
 * preservada quando possivel (minusculas, Title Case, MAIUSCULAS).
 */

// ---------------------------------------------------------------------------
// 1. Mapa de correcoes  (chave = grafia errada lowercase, valor = forma correta)
// ---------------------------------------------------------------------------

export const corrections: Map<string, string> = new Map([
  // ---- Correcoes de acentuacao ----
  ["voce", "voc\u00ea"],
  ["nao", "n\u00e3o"],
  ["tambem", "tamb\u00e9m"],
  ["ate", "at\u00e9"],
  ["entao", "ent\u00e3o"],
  ["ja", "j\u00e1"],
  ["so", "s\u00f3"],
  ["sera", "ser\u00e1"],
  ["esta", "est\u00e1"],
  ["numero", "n\u00famero"],
  ["codigo", "c\u00f3digo"],
  ["area", "\u00e1rea"],
  ["tecnico", "t\u00e9cnico"],
  ["relatorio", "relat\u00f3rio"],
  ["orcamento", "or\u00e7amento"],
  ["medicao", "medi\u00e7\u00e3o"],
  ["construcao", "constru\u00e7\u00e3o"],
  ["producao", "produ\u00e7\u00e3o"],
  ["manutencao", "manuten\u00e7\u00e3o"],
  ["inspecao", "inspe\u00e7\u00e3o"],
  ["avaliacao", "avalia\u00e7\u00e3o"],
  ["aprovacao", "aprova\u00e7\u00e3o"],
  ["situacao", "situa\u00e7\u00e3o"],
  ["informacao", "informa\u00e7\u00e3o"],
  ["operacao", "opera\u00e7\u00e3o"],
  ["organizacao", "organiza\u00e7\u00e3o"],
  ["administracao", "administra\u00e7\u00e3o"],
  ["comunicacao", "comunica\u00e7\u00e3o"],
  ["documentacao", "documenta\u00e7\u00e3o"],
  ["autorizacao", "autoriza\u00e7\u00e3o"],
  ["verificacao", "verifica\u00e7\u00e3o"],
  ["notificacao", "notifica\u00e7\u00e3o"],
  ["configuracao", "configura\u00e7\u00e3o"],
  ["programacao", "programa\u00e7\u00e3o"],
  ["instalacao", "instala\u00e7\u00e3o"],
  ["movimentacao", "movimenta\u00e7\u00e3o"],
  ["classificacao", "classifica\u00e7\u00e3o"],
  ["localizacao", "localiza\u00e7\u00e3o"],
  ["negociacao", "negocia\u00e7\u00e3o"],
  ["solicitacao", "solicita\u00e7\u00e3o"],
  ["identificacao", "identifica\u00e7\u00e3o"],
  ["padrao", "padr\u00e3o"],
  ["orgao", "\u00f3rg\u00e3o"],
  ["possivel", "poss\u00edvel"],
  ["disponivel", "dispon\u00edvel"],
  ["responsavel", "respons\u00e1vel"],
  ["favoravel", "favor\u00e1vel"],
  ["viavel", "vi\u00e1vel"],
  ["util", "\u00fatil"],
  ["dificil", "dif\u00edcil"],
  ["facil", "f\u00e1cil"],
  ["horario", "hor\u00e1rio"],
  ["necessario", "necess\u00e1rio"],
  ["temporario", "tempor\u00e1rio"],
  ["salario", "sal\u00e1rio"],
  ["funcionario", "funcion\u00e1rio"],
  ["secretario", "secret\u00e1rio"],
  ["formulario", "formul\u00e1rio"],
  ["inventario", "invent\u00e1rio"],
  ["calendario", "calend\u00e1rio"],
  ["financas", "finan\u00e7as"],
  ["servico", "servi\u00e7o"],
  ["comercio", "com\u00e9rcio"],
  ["preco", "pre\u00e7o"],
  ["inicio", "in\u00edcio"],
  ["termino", "t\u00e9rmino"],
  ["periodo", "per\u00edodo"],
  ["metodo", "m\u00e9todo"],
  ["logistica", "log\u00edstica"],
  ["diagnostico", "diagn\u00f3stico"],
  ["analise", "an\u00e1lise"],
  ["sindico", "s\u00edndico"],
  ["unico", "\u00fanico"],
  ["publico", "p\u00fablico"],
  ["valido", "v\u00e1lido"],
  ["credito", "cr\u00e9dito"],
  ["debito", "d\u00e9bito"],
  ["transito", "tr\u00e2nsito"],
  ["deposito", "dep\u00f3sito"],
  ["titulo", "t\u00edtulo"],
  ["veiculo", "ve\u00edculo"],
  ["obrigatorio", "obrigat\u00f3rio"],
  ["endereco", "endere\u00e7o"],
  ["usuario", "usu\u00e1rio"],
  ["eletrica", "el\u00e9trica"],
  ["hidraulica", "hidr\u00e1ulica"],
  ["impermeabilizacao", "impermeabiliza\u00e7\u00e3o"],
  ["tubulacao", "tubula\u00e7\u00e3o"],
  ["demolicao", "demoli\u00e7\u00e3o"],
  ["pavimentacao", "pavimenta\u00e7\u00e3o"],
  ["sinalizacao", "sinaliza\u00e7\u00e3o"],

  // ---- Erros de digitacao comuns ----
  ["bom dai", "bom dia"],
  ["instagrama", "instagram"],
  ["teh", "the"],
  ["acessssar", "acessar"],
  ["acesssar", "acessar"],
  ["resposavel", "respons\u00e1vel"],
  ["resposanvel", "respons\u00e1vel"],
  ["responssavel", "respons\u00e1vel"],
  ["fucnionario", "funcion\u00e1rio"],
  ["funcioanrio", "funcion\u00e1rio"],
  ["funcioario", "funcion\u00e1rio"],
  ["clinete", "cliente"],
  ["cleinte", "cliente"],
  ["ciente", "cliente"],
  ["fautrar", "faturar"],
  ["pagametno", "pagamento"],
  ["pagameno", "pagamento"],
  ["oracmento", "or\u00e7amento"],
  ["recebimeto", "recebimento"],
  ["recebiento", "recebimento"],
  ["fornecdeor", "fornecedor"],
  ["forncedor", "fornecedor"],
  ["fornecdor", "fornecedor"],
  ["conrrato", "contrato"],
  ["contrao", "contrato"],
  ["proejto", "projeto"],
  ["porjeto", "projeto"],
  ["projto", "projeto"],
  ["materail", "material"],
  ["matreial", "material"],
  ["equiapmento", "equipamento"],
  ["euqipamento", "equipamento"],
  ["equipameno", "equipamento"],
  ["trablaho", "trabalho"],
  ["trabaloh", "trabalho"],
  ["traablho", "trabalho"],
  ["docuemnto", "documento"],
  ["documetno", "documento"],
  ["sistmea", "sistema"],
  ["sisetma", "sistema"],
  ["cadatro", "cadastro"],
  ["cadastor", "cadastro"],
  ["ususario", "usu\u00e1rio"],
  ["usuairo", "usu\u00e1rio"],
  ["emrpesa", "empresa"],
  ["emprea", "empresa"],
  ["empressa", "empresa"],
  ["endereoc", "endere\u00e7o"],
  ["enedreco", "endere\u00e7o"],
  ["telefoen", "telefone"],
  ["telfeone", "telefone"],
  ["entrga", "entrega"],
  ["etrega", "entrega"],

  // ---- Abreviacoes de internet ----
  ["vc", "voc\u00ea"],
  ["tb", "tamb\u00e9m"],
  ["tbm", "tamb\u00e9m"],
  ["pq", "porque"],
  ["qd", "quando"],
  ["hj", "hoje"],
  ["msg", "mensagem"],
  ["obg", "obrigado"],
  ["vlw", "valeu"],
  ["blz", "beleza"],
  ["qto", "quanto"],
  ["pfv", "por favor"],
  ["flw", "falou"],
  ["abs", "abra\u00e7os"],
  ["dps", "depois"],
  ["ngm", "ningu\u00e9m"],
  ["cmg", "comigo"],
  ["ctg", "contigo"],
  ["mt", "muito"],
  ["mto", "muito"],
  ["qse", "quase"],
  ["vdd", "verdade"],
  ["msm", "mesmo"],
  ["nd", "nada"],
  ["td", "tudo"],
  ["oq", "o que"],
  ["dnv", "de novo"],
  ["agr", "agora"],
  ["tmj", "estamos juntos"],
  ["sdds", "saudades"],

  // ---- Termos de construcao / engenharia ----
  ["argamasa", "argamassa"],
  ["ferramen", "ferragem"],
  ["armacao", "arma\u00e7\u00e3o"],
  ["escavacao", "escava\u00e7\u00e3o"],
  ["fundacao", "funda\u00e7\u00e3o"],
  ["impermeabilzacao", "impermeabiliza\u00e7\u00e3o"],
  ["impreabilizacao", "impermeabiliza\u00e7\u00e3o"],
  ["terraplenagen", "terraplenagem"],
  ["terraplenagm", "terraplenagem"],
  ["terraplanagem", "terraplenagem"],
  ["concretagen", "concretagem"],
  ["alvenarria", "alvenaria"],
  ["alveneria", "alvenaria"],
  ["encanameto", "encanamento"],
  ["eletirca", "el\u00e9trica"],
  ["eletrcia", "el\u00e9trica"],
  ["hidralica", "hidr\u00e1ulica"],
  ["hidraulcia", "hidr\u00e1ulica"],
  ["estrutrua", "estrutura"],
  ["esturtura", "estrutura"],
  ["topograifa", "topografia"],
  ["sondagen", "sondagem"],
  ["drenagen", "drenagem"],
]);

// ---------------------------------------------------------------------------
// 2. correctWord  -  Correcao de palavra individual
// ---------------------------------------------------------------------------

/**
 * Procura uma palavra no mapa de correcoes (case-insensitive).
 * Retorna a palavra corrigida ou `null` se nenhuma correcao for necessaria.
 */
export function correctWord(word: string): string | null {
  const key = word.toLowerCase().trim();
  if (!key) return null;

  const corrected = corrections.get(key);
  if (!corrected || corrected === key) return null;

  // Preserva a capitalizacao original
  if (word === word.toUpperCase() && word.length > 1) {
    return corrected.toUpperCase();
  }
  if (
    word[0] === word[0].toUpperCase() &&
    word.slice(1) === word.slice(1).toLowerCase()
  ) {
    return corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }

  return corrected;
}

// ---------------------------------------------------------------------------
// 3. correctText  -  Correcao de texto inteiro
// ---------------------------------------------------------------------------

export interface TextChange {
  original: string;
  corrected: string;
  position: number;
}

/**
 * Processa um texto inteiro, aplica correcoes e retorna o texto corrigido
 * junto com a lista de alteracoes realizadas.
 */
export function correctText(text: string): {
  corrected: string;
  changes: TextChange[];
} {
  if (!text) return { corrected: text, changes: [] };

  const changes: TextChange[] = [];
  let result = text;

  // ------ Fase 1: expressoes de multiplas palavras ------
  const multiWordEntries = Array.from(corrections.entries()).filter(
    ([key]) => key.includes(" "),
  );

  for (const [typo, fix] of multiWordEntries) {
    const regex = new RegExp(`\\b${escapeRegex(typo)}\\b`, "gi");
    let match: RegExpExecArray | null;

    // Coleta posicoes no texto atual antes de substituir
    const snapshot = result;
    regex.lastIndex = 0;
    match = regex.exec(snapshot);
    while (match !== null) {
      changes.push({
        original: match[0],
        corrected: matchCase(match[0], fix),
        position: match.index,
      });
      match = regex.exec(snapshot);
    }

    result = result.replace(regex, (matched) => matchCase(matched, fix));
  }

  // ------ Fase 2: palavras individuais ------
  const wordRegex = /[a-zA-Z\u00C0-\u024F]+/g;
  let wordMatch: RegExpExecArray | null;
  const replacements: Array<{
    start: number;
    end: number;
    original: string;
    replacement: string;
  }> = [];

  wordRegex.lastIndex = 0;
  wordMatch = wordRegex.exec(result);
  while (wordMatch !== null) {
    const word = wordMatch[0];
    const correction = correctWord(word);
    if (correction !== null && correction !== word) {
      replacements.push({
        start: wordMatch.index,
        end: wordMatch.index + word.length,
        original: word,
        replacement: correction,
      });
    }
    wordMatch = wordRegex.exec(result);
  }

  // Aplica de tras pra frente para preservar indices
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    result =
      result.substring(0, r.start) + r.replacement + result.substring(r.end);
    changes.push({
      original: r.original,
      corrected: r.replacement,
      position: r.start,
    });
  }

  // Ordena por posicao crescente
  changes.sort((a, b) => a.position - b.position);

  return { corrected: result, changes };
}

// ---------------------------------------------------------------------------
// 4. autoCapitalize  -  Capitalizacao automatica apos pontuacao
// ---------------------------------------------------------------------------

/**
 * Capitaliza a primeira letra apos pontuacao final de frase (. ! ?).
 * Tambem capitaliza a primeira letra do texto.
 */
export function autoCapitalize(text: string): string {
  if (!text) return text;

  // Primeira letra do texto
  let result = text.replace(/^\s*[a-zA-Z\u00C0-\u024F]/, (m) =>
    m.toUpperCase(),
  );

  // Primeira letra apos . ! ? seguidos de espaco(s)
  result = result.replace(
    /([.!?])\s+([a-zA-Z\u00C0-\u024F])/g,
    (_m, punct: string, letter: string) => `${punct} ${letter.toUpperCase()}`,
  );

  return result;
}

// ---------------------------------------------------------------------------
// 5. isExemptField  -  Campos isentos de correcao
// ---------------------------------------------------------------------------

const EXEMPT_FIELDS = new Set([
  "email",
  "e-mail",
  "url",
  "cnpj",
  "cpf",
  "cep",
  "phone",
  "telefone",
  "password",
  "senha",
  "code",
  "codigo",
  "username",
  "login",
  "token",
  "api_key",
  "apikey",
  "api-key",
  "hash",
  "ip",
  "mac",
  "uuid",
  "id",
  "slug",
]);

/**
 * Retorna `true` se o campo NAO deve receber correcao ortografica.
 * A verificacao e case-insensitive.
 */
export function isExemptField(fieldName: string): boolean {
  if (!fieldName) return false;
  return EXEMPT_FIELDS.has(fieldName.toLowerCase().trim());
}

// ---------------------------------------------------------------------------
// Funcoes auxiliares internas
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Preserva o padrao de caixa do texto original ao aplicar a correcao. */
function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (
    original[0] === original[0].toUpperCase() &&
    original.slice(1) === original.slice(1).toLowerCase()
  ) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

// utils/formatAIContent.js

export const formatAIContent = (content: string) => {
  if (!content) return "";

  // 1. Сначала чиним экранированные переносы строк (ваша старая проблема)
  const cleanContent = content.replace(/\\n/g, '\n');

  // 2. Пытаемся найти начало технического JSON блока.
  // Обычно он начинается с ключевых слов, которые есть в вашем примере.
  // Ищем место, где начинается "env": { или "file_graph": {
  // Мы ищем паттерн, похожий на начало JSON-ключа в новой строке или после запятой
  const jsonStartIndex = cleanContent.search(/(\"env\":|\"file_graph\":|\"src\/App.jsx\":)/);

  if (jsonStartIndex !== -1) {
    // Нашли JSON! Нам нужно найти ближайшую открывающую скобку '{' или начало структуры перед этим
    // Но в вашем случае это похоже на "хвост" данных.

    // Простой вариант: Разрезаем строку на две части
    // Находим последнюю закрывающую фигурную скобку текста или начало JSON

    const textPart = cleanContent.substring(0, jsonStartIndex);
    // Ищем, где этот "мусорный" JSON начался (обычно чуть раньше найденного ключа, например с запятой или скобки)
    // Для простоты, давайте просто обернем всё начиная с найденного места, 
    // но лучше найти последнюю пустую строку перед этим.

    const lastNewLineBeforeJson = cleanContent.lastIndexOf('\n', jsonStartIndex);

    const markdownPart = cleanContent.substring(0, lastNewLineBeforeJson);
    const jsonPart = cleanContent.substring(lastNewLineBeforeJson);

    // Возвращаем склеенный результат: Текст + Блок кода
    return `${markdownPart}\n\n\`\`\`json${jsonPart}\n\`\`\``;
  }

  return cleanContent;
};

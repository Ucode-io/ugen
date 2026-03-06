import { useState, useEffect, useRef } from 'react';

export const useTypewriter = (text: string, speed: number = 10) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    // Если текст изменился полностью (новая задача), сбрасываем
    setDisplayedText('');
    indexRef.current = 0;
  }, [text]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Если показали весь текст — останавливаем
      if (indexRef.current >= text.length) {
        clearInterval(intervalId);
        return;
      }

      // Берем следующий кусок символов. 
      // Можно брать по 1 символу, но для кода лучше по 2-3, чтобы было быстрее
      const chunkSize = 2;
      const nextChunk = text.slice(indexRef.current, indexRef.current + chunkSize);

      setDisplayedText((prev) => prev + nextChunk);
      indexRef.current += chunkSize;
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  if (speed === 0) {
    return text;
  }

  // Возвращаем текст + мигающий курсор (опционально)
  return displayedText;
};

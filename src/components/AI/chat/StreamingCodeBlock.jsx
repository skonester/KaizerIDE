import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function StreamingCodeBlock({ content, language, isStreaming }) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const contentRef = useRef('');
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    if (!isStreaming) {
      // If not streaming, show full content immediately
      setDisplayedContent(content);
      setCursorVisible(false);
      return;
    }

    // Streaming mode - animate character by character
    const targetContent = content;
    
    if (targetContent.length > contentRef.current.length) {
      // New content added
      const charsToAdd = targetContent.length - contentRef.current.length;
      const chunkSize = Math.max(1, Math.ceil(charsToAdd / 10)); // Add multiple chars at once for speed
      
      const animate = () => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateRef.current;
        
        // Update every 16ms (60fps) or slower
        if (timeSinceLastUpdate >= 16) {
          if (contentRef.current.length < targetContent.length) {
            const nextLength = Math.min(
              contentRef.current.length + chunkSize,
              targetContent.length
            );
            contentRef.current = targetContent.substring(0, nextLength);
            setDisplayedContent(contentRef.current);
            lastUpdateRef.current = now;
          }
        }
        
        if (contentRef.current.length < targetContent.length) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Content unchanged or reduced
      contentRef.current = targetContent;
      setDisplayedContent(targetContent);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [content, isStreaming]);

  // Cursor blink effect
  useEffect(() => {
    if (!isStreaming) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="code-block-wrapper streaming-code-block">
      {language && (
        <div className="code-block-header">
          <span className="code-block-lang">{language}</span>
          <button className="code-copy-btn" onClick={handleCopy}>
            Copy
          </button>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={language || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: language ? '0 0 8px 8px' : '8px',
            fontSize: '12.5px',
            background: 'var(--bg-2)',
            paddingRight: isStreaming ? '20px' : '12px',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.5'
            }
          }}
        >
          {displayedContent || ' '}
        </SyntaxHighlighter>
        {isStreaming && cursorVisible && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              width: '8px',
              height: '16px',
              background: 'var(--accent)',
              animation: 'none',
              borderRadius: '1px',
            }}
          />
        )}
      </div>
    </div>
  );
}

export default StreamingCodeBlock;

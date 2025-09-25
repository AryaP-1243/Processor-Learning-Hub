
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements = [];
    let inCodeBlock = false;
    let codeBlockContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="bg-gray-900 p-4 rounded-md my-4 overflow-x-auto">
              <code className="font-mono text-sm text-gray-200">{codeBlockContent.trim()}</code>
            </pre>
          );
          codeBlockContent = '';
        }
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-3xl font-bold mt-6 mb-3">{line.substring(2)}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-2xl font-bold mt-5 mb-2">{line.substring(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.substring(4)}</h3>);
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        elements.push(
          <li key={i} className="ml-6 list-disc">{line.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>
        );
      } else if (line.trim() === '') {
        elements.push(<br key={`br-${i}`} />);
      } else {
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<p key={i} dangerouslySetInnerHTML={{ __html: formattedLine }}></p>);
      }
    }

    if (inCodeBlock && codeBlockContent) {
        elements.push(
            <pre key="code-end" className="bg-gray-900 p-4 rounded-md my-4 overflow-x-auto">
              <code className="font-mono text-sm text-gray-200">{codeBlockContent.trim()}</code>
            </pre>
        );
    }
    
    return elements;
  };

  return <div className="space-y-2 text-gray-300">{renderContent()}</div>;
};

export default MarkdownRenderer;

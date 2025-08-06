import React from 'react';

function FileLabels({ isFlipped }) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const finalFiles = isFlipped ? [...files].reverse() : files;

  return (
    <div className="file-labels">
      {finalFiles.map(file => (
        <div key={file} className="label">{file}</div>
      ))}
    </div>
  );
}

export default FileLabels;

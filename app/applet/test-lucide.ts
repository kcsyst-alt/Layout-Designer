import { renderToStaticMarkup } from 'react-dom/server';
import { Monitor } from 'lucide-react';
import React from 'react';

const svg = renderToStaticMarkup(React.createElement(Monitor, { color: '#10b981', strokeWidth: 2.5 }));
console.log(svg);

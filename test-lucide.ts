import { renderToStaticMarkup } from 'react-dom/server';
import { Monitor } from 'lucide-react';
import React from 'react';

const icon = React.createElement(Monitor, { size: 20 });
const svg = renderToStaticMarkup(React.cloneElement(icon, { color: '#10b981', strokeWidth: 2.5 }));
console.log(svg);

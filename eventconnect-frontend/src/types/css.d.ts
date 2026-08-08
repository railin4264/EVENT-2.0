// Allow importing CSS from node_modules (e.g. leaflet/dist/leaflet.css) in
// dynamic imports without a type error. Next.js handles the actual bundling.
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'leaflet/dist/leaflet.css';

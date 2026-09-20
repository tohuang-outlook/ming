// All runtime dependencies are bundled by esbuild. Do not collect the parent
// website's node_modules into the desktop application.
module.exports = async () => false;

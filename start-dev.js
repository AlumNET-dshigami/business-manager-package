process.chdir(__dirname);
process.argv = [process.argv[0], "next", "dev", "--turbopack", "--port", "3002"];
require("./node_modules/next/dist/bin/next");

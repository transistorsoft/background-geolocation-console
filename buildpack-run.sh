# Generating js/bundle.min.js file
npm run build

# Replacing stuff for PRODUCTION
echo "Replacing bundle.js reference into index.html..."
sed -i "s/js\\/bundle.js/js\\/bundle.min.js/" index.html
echo "=> Done !"

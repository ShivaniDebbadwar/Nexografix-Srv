
// hash.js
const bcrypt = require("bcrypt");

const generateHash = async () => {
  const password = "Akash123"; // 🔒 Replace with the password you want adminpassword
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed Password:", hashedPassword);
};

generateHash();

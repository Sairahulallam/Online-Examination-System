import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await findUserByEmail(email);
  if (userExists)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser(name, email, hashedPassword, role);

  res.status(201).json({
    id: user.id,
    name: user.name,
    role: user.role,
    token: generateToken(user.id, user.role),
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user)
    return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    id: user.id,
    name: user.name,
    role: user.role,
    token: generateToken(user.id, user.role),
  });
};

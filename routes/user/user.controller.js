const prisma = require("../../utils/prisma");
require("dotenv").config();
const bcrypt = require("bcrypt");
const { uploadToS3, generateSignedUrl } = require("../../utils/upload");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;
const Email = require("../../utils/email");
const fs = require('fs');
const path = require('path');
const emailTemplatePath = path.join(__dirname, '../../utils/emailForgotPasswordTemplate.html');
let emailTemplateHtml = fs.readFileSync(emailTemplatePath, 'utf-8');
/**
 * Generates a random string of the specified length.
 * @param {number} length - The length of the string to generate.
 * @returns {string} A random string of the specified length.
 */
function makePassword(length) {
  // Define the characters that can be used
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  // Initialize the password
  let password = "";

  // Loop through the length and add a random character each time
  for (let i = 0; i < length; i++) {
    password += characters[Math.floor(Math.random() * characters.length)];
  }
  return password;
}


/**
 * Login user
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const login = async (req, res) => {
  try {
    // Find all users
    const allUser = await prisma.user.findMany();

    // Find the user by email and password
    const user = allUser.find(
      (u) =>
        u.email === req.body.email &&
        bcrypt.compareSync(req.body.password, u.password)
    );

    // Check if the user is found before proceeding
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email or password is incorrect" });
    }

    // Get permissions from user roles
    const permissions = await prisma.role.findUnique({
      where: {
        id: user.roleId,
      },
      include: {
        rolePermission: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Get the names of all the permissions
    const permissionNames =
      permissions?.rolePermission.map((rp) => rp.permission.name) || [];

    // Get the type of user
    const userType = await prisma.role.findUnique({
      where: {
        id: user.roleId,
      },
    });

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user.id, branchId: user.branchId, role: userType.name, permissions: permissionNames },
      secret,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    // Return the user without the password and the token
    const { password, ...userWithoutPassword } = user;
    return res.status(200).json({
      ...userWithoutPassword,
      token,
    });
  } catch (error) {
    // Return an error message if there is an error
    return res.status(400).json({ message: error.message });
  }
};


/**
 * Handles the registration of a new user.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 *
 */
const register = async (req, res) => {
  try {
    // Authorization Check (Only admins can create users)
    if (!req.auth.permissions.includes("create-user")) {
      return res.status(403).json({ message: "Unauthorized. You are not an admin." });
    }

    // Validate required fields
    const { name, email, password, phoneNumber, address, city, status, roleId } = req.body;

    if (!name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (!email) {
      return res.status(400).send({ message: "Email is required." });
    }
    if (!phoneNumber) {
      return res.status(400).send({ message: " Phone number is required." });
    }
    if (!password) {
      return res.status(400).send({ message: "Password is required." });
    }

    // Check if the email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        branchId: req.auth.branchId,
        isDeleted: false,
      }
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists. Please use a different email." });
    }
    // Upload Image to S3 if provided, else use default image
    let profileImageUrl = null;
    if (req.file) {
      profileImageUrl = await uploadToS3(req.file);
    } else {
      profileImageUrl = "https://dev-valuelens.s3.ap-south-1.amazonaws.com/1744094007756-download.jpg"; // Provide your actual default profile image URL
    }

    const hash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hash, // Store the hashed password
        phoneNumber,
        address,
        city,
        status,
        profileImage: profileImageUrl,
        roleId: parseInt(roleId),
        branchId: req.auth.branchId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
      },

    });

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


// Updates a single user
/**
 * @param {object} req - The request object
 * @param {object} res - The response object
 *
 */
const updateSingleUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Authorization Check:
    // - Only admins can update other users
    // - Normal users can update their own user
    if (
      userId !== req.auth.sub &&
      !req.auth.permissions.includes("update-user")
    ) {
      return res.status(403).json({ message: "Unauthorized. You are not an admin." });
    }

    // Validate required fields
    if (!req.body.email || !req.body.name) {
      return res.status(400).json({ message: "Email and name are required fields." });
    }

    // Check if the email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: req.body.email,
        branchId: req.auth.branchId,
        isDeleted: false,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already in use by another user." });
    }

    // Upload Image to S3 if provided
    let profileImageUrl = req.body.profileImage;
    if (req.file) {
      profileImageUrl = await uploadToS3(req.file);
    }

    const updatedData = {
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      address: req.body.address,
      city: req.body.city,
      status: req.body.status,
      profileImage: profileImageUrl,
      updatedAt: new Date(),
    };

    const updateUser = await prisma.user.update({
      where: { id: userId },
      data: updatedData,
      include: {
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
      },
    });

    // Generate signed URL if image exists
    const signedUrl = await generateSignedUrl(updateUser.profileImage);

    return res.status(200).json({
      message: "User updated successfully",
      updatedUser: {
        ...updateUser,
        profileImage: signedUrl  // Include the signed URL in response

      }
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


// Get all users with an optional query parameter to filter by status
// If the query parameter is "all", get all users
// If the query parameter is "true", get only active users (isDeleted = false)
// If no query parameter is provided, get all inactive users (isDeleted = true)
// Return a JSON response with the user data and a signed URL for the profileImage
const getAllUser = async (req, res) => {
  let users;
  if (req.query.query === "all") {
    try {
      // Get all users and remove createdAt, updatedAt, and isDeleted fields
      const allUser = await prisma.user.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          createdAt: false,
          updatedAt: false,
          isDeleted: false,
        },
      });
      // Remove password field and generate signed URLs for profileImage
      const usersWithSignedUrls = await Promise.all(
        allUser.map(async (user) => {
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            profileImage: await generateSignedUrl(user.profileImage),
          };
        })
      );
      return res.status(200).json(usersWithSignedUrls);
    } catch (error) {
      // Return an error message if something goes wrong
      return res.status(400).json({ message: error.message });
    }
  } else if (req.query.status === "true") {
    try {
      // Get all active users and remove createdAt, updatedAt, and isDeleted fields
      const allUser = await prisma.user.findMany({
        where: {
          NOT: {
            isDeleted: true,
          },
        },
        orderBy: {
          id: "asc",
        },
        include: {
          createdAt: false,
          updatedAt: false,
          isDeleted: false,
        },
      });
      // Remove password field and generate signed URLs for profileImage
      const usersWithSignedUrls = await Promise.all(
        allUser.map(async (user) => {
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            profileImage: await generateSignedUrl(user.profileImage),
          };
        })
      );
      return res.status(200).json(usersWithSignedUrls);

    } catch (error) {
      // Return an error message if something goes wrong
      return res.status(400).json({ message: error.message });
    }
  } else {
    try {
      // Get all inactive users and remove createdAt, updatedAt, and isDeleted fields
      const allUser = await prisma.user.findMany({
        orderBy: {
          id: "asc",
        },
        include: {
          createdAt: false,
          updatedAt: false,
          isDeleted: false,
        },
      });

      // Remove password field and generate signed URLs for profileImage
      const usersWithSignedUrls = await Promise.all(
        allUser.map(async (user) => {
          const { password, ...userWithoutPassword } = user;
          return {
            ...userWithoutPassword,
            profileImage: await generateSignedUrl(user.profileImage),
          };
        })
      );
      return res.status(200).json(usersWithSignedUrls);
    } catch (error) {
      // Return an error message if something goes wrong
      return res.status(400).json({ message: error.message });
    }
  }
};


// Get a single user by ID
/**
 * @function getSingleUser
 * @description Get a single user by ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const getSingleUser = async (req, res) => {
  try {
    let users;
    const id = parseInt(req.params.id);
    // Check if the user is an admin or the user is trying to access their own profile
    if (
      id !== req.auth.sub &&
      !req.auth.permissions.includes("readSingle-user")
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized. You are not an admin" });
    }
    // Find the user by ID
    const singleUser = await prisma.user.findUnique({
      where: {
        id: parseInt(req.params.id),
      },
      include: {
        reservations: true,
        holiday: true,
        createdAt: false,
        updatedAt: false,
        isDeleted: false,
      },
    });

    // Check if the user is found
    if (!singleUser || !singleUser.status) {
      return res.status(400).json({ message: "User not found." });
    }

    // Generate signed URL for the user's profile image
    const { password, ...userWithoutPassword } = singleUser;
    const userWithSignedUrl = {
      ...userWithoutPassword,
      profileImage: await generateSignedUrl(singleUser.profileImage),
    };

    // Return the user with the signed URL
    return res.status(200).json(userWithSignedUrl);
  } catch (error) {
    // Return an error message if something goes wrong
    return res.status(400).json({
      message: "An error occurred while fetching the user",
      error: error.message
    });
  }
};


//delete single user
/**
 * Delete a single user
 * @param {Object} req - The request object containing parameters and authentication information
 * @param {Object} res - The response object used to return status and JSON data
 */
const deleteSingleUser = async (req, res) => {
  try {
    // Check if the user has the necessary permissions to delete a user
    if (!req.auth.permissions.includes("delete-user")) {
      return res
        .status(401)
        .json({ message: "Unauthorized. Only admin can delete." });
    }

    // Extract user ID from request parameters
    const { id } = req.params;

    // Validate if the user ID is provided
    if (!id) {
      return res.status(400).json({ message: "user ID is required" });
    }

    // Check if the user exists and is not deleted
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        isDeleted: false
      },
    });

    // If user is not found, return 404 error
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Perform a soft delete on the user
    const deletedUser = await prisma.user.update({
      where: {
        id: parseInt(id),
        branchId: req.auth.branchId,
      },
      data: {
        isDeleted: true,
      },
      include: {
        createdAt: false,
        updatedAt: false,
      },
    });

    // Return a success message with the deleted user information
    return res.status(200).json({
      message: "User deleted successfully",
      setting: deletedUser,
    });
  } catch (error) {
    // Return an error message if an exception occurs
    return res.status(400).json({
      error: error.message,
    });
  }
};

/**
 * Resets the password for the user with the given ID.
 * @function resetPassword
 * @param {Object} req - The request object containing parameters and authentication information
 * @param {Object} res - The response object used to return status and JSON data
 */
const resetPassword = async (req, res) => {
  try {
    // Validate that the user is authorized to reset their own password
    const accessToken = Number(req.auth.sub);
    const user_id = Number(req.params.id);

    if (accessToken !== user_id) {
      return res.status(200).json({ message: "You are unauthorized to reset this user's password" });
    }

    // Retrieve the user by ID
    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
        isDeleted: false,
      },
    });

    // Check that the user exists and the old password matches
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldPass = bcrypt.compareSync(req.body.oldPassword, user.password);
    if (oldPass === false) {
      return res.status(200).json({ message: "Old password does not match" });
    }

    // Hash the new password
    const hash = await bcrypt.hash(req.body.password, saltRounds);

    // Update the user's password
    const updatePass = await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        password: hash,
      },
    });

    // Return a success message if the update is successful
    if (updatePass) {
      return res.status(200).json({ message: "Password updated successfully" });
    }

    // Return an error message if the update fails
    return res.status(400).json({ message: "Failed to update password" });
  } catch (error) {
    // Return an error message if an exception occurs
    return res.status(400).json({ message: error.message });
  }
};

/**
 * Handles the forgot password logic
 * @function forgotPassword
 * @param {Object} req - The request object containing parameters and authentication information
 * @param {Object} res - The response object used to return status and JSON data
 */

const forgotPassword = async (req, res) => {
  try {


    const email = req.body.email;
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        isDeleted: false,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Email Not Found" });
    }

    // Generate a new password for the user
    const generatePass = makePassword(10);
    const hash = await bcrypt.hash(generatePass, saltRounds);

    // Update the user's password
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hash,
      },
    });
    // Send a password reset email to the user
    emailBody = emailTemplateHtml
      .replace('${user.name}', user.name)
      .replace('${email}', email)
      .replace('${generatePass}', generatePass);
    const crmEmail = await Email.email(
      email,
      `Password Reset-${user.name}`,
      emailBody
    );
    if (crmEmail.error) {
      return res.status(400).json({ error: crmEmail.error });
    }

    return res.status(200).json({ message: "Please check your email" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};


module.exports = {
  login,
  register,
  getAllUser,
  getSingleUser,
  updateSingleUser,
  deleteSingleUser,
  resetPassword,
  forgotPassword
};

const fs = require("fs");
const path = require("path");
const Category = require("../models/categoryModel");

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        const categoriesWithImages = categories.map(category => ({
            _id: category._id,
            name: category.name,
            description: category.description,
            image: category.image ? `${req.protocol}://${req.get("host")}/uploads/${category.image}` : null,
            subcategories: category.subcategories.map(subcategory => ({
                _id: subcategory._id,
                name: subcategory.name,
                description: subcategory.description,
                image: subcategory.image ? `${req.protocol}://${req.get("host")}/uploads/${subcategory.image}` : null
            }))
        }));

        res.json(categoriesWithImages);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findById(id);
        
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        const categoryWithImage = {
            _id: category._id,
            name: category.name,
            description: category.description,
            image: category.image ? `${req.protocol}://${req.get("host")}/uploads/${category.image}` : null,
            subcategories: category.subcategories 
        };

        res.json(categoryWithImage);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!name || !description) {
            return res.status(400).json({ error: "Name and Description are required" });
        }

        const newCategory = new Category({ name, description, image });
        await newCategory.save();

        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const newImage = req.file ? req.file.filename : undefined;

        const category = await Category.findById(id);
        if (!category) return res.status(404).json({ error: "Category not found" });

        if (newImage && category.image) {
            const oldImagePath = path.join(__dirname, "..", "uploads", category.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        category.name = name || category.name;
        category.description = description || category.description;
        if (newImage) category.image = newImage;

        await category.save();
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: "Error updating category" });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        if (category.image) {
            const imagePath = path.join(__dirname, "..", "uploads", category.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        await Category.findByIdAndDelete(id);
        res.json({ message: "Category and image deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting category" });
    }
};

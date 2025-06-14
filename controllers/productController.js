const fs = require("fs");
const path = require("path");
const Product = require("../models/productModel");

exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find();
        const productsWithImages = products.map(product => ({
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image ? `${req.protocol}://${req.get("host")}/uploads/${product.image}` : null
        }));

        res.json(productsWithImages);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const productWithImage = {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image ? `${req.protocol}://${req.get("host")}/uploads/${product.image}` : null
        };

        res.json(productWithImage);
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const image = req.file ? req.file.filename : null;

        if (!name || !description || !price) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newProduct = new Product({ name, description, price, image });
        await newProduct.save();

        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price } = req.body;
        const newImage = req.file ? req.file.filename : undefined;

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        if (newImage && product.image) {
            const oldImagePath = path.join(__dirname, "..", "uploads", product.image);
            if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }

        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        if (newImage) product.image = newImage;

        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: "Error updating product" });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        if (product.image) {
            const imagePath = path.join(__dirname, "..", "uploads", product.image);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        await Product.findByIdAndDelete(id);
        res.json({ message: "Product and image deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting product" });
    }
};

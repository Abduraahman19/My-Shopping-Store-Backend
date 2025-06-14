const Order = require('../models/orderModel');

const calculateOrderDetails = (products) => {
    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    const grandTotal = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return { totalProducts, totalQuantity, grandTotal };
};

exports.createOrder = async (req, res) => {
    try {
        const { customer, products, shippingMethod, paymentMethod, status } = req.body;

        if (!customer || !products || !shippingMethod || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                requiredFields: ['customer', 'products', 'shippingMethod', 'paymentMethod']
            });
        }

        const { totalProducts, totalQuantity, grandTotal } = calculateOrderDetails(products);

        let paymentStatus = "Unpaid";

        const newOrder = new Order({
            customer,
            products: products.map(p => ({
                product: p.productId,
                name: p.name,
                image: p.image, 
                price: p.price,
                quantity: p.quantity,
                totalPrice: p.price * p.quantity
            })),
            totalProducts,
            totalQuantity,
            grandTotal,
            shippingMethod,
            paymentMethod,
            paymentStatus,
            status: status || 'Processing'
        });

        await newOrder.save();

        const responseOrder = newOrder.toObject();
        res.status(201).json({
            success: true,
            order: responseOrder,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
        if (req.query.customerId) filter['customer._id'] = req.query.customerId;

        const orders = await Order.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalOrders = await Order.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: orders.length,
            total: totalOrders,
            page,
            pages: Math.ceil(totalOrders / limit),
            orders: orders.map(order => {
                const orderObj = order.toObject();
                delete orderObj.paymentDetails;
                return orderObj;
            })
        });
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error',
            message: error.message 
        });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);

        if (!order) return res.status(404).json({ 
            success: false,
            error: 'Order not found' 
        });

        const orderObj = order.toObject();
        delete orderObj.paymentDetails;

        res.status(200).json({
            success: true,
            order: orderObj
        });
    } catch (error) {
        console.error('Get Order by ID Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error',
            message: error.message 
        });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus, products } = req.body;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ 
            success: false,
            error: 'Order not found' 
        });

        const updates = {};
        if (status) updates.status = status;
        if (paymentStatus) updates.paymentStatus = paymentStatus;

        if (products && Array.isArray(products)) {
            const { totalProducts, totalQuantity, grandTotal } = calculateOrderDetails(products);
            updates.products = products.map(p => ({
                ...p,
                totalPrice: p.price * p.quantity
            }));
            updates.totalProducts = totalProducts;
            updates.totalQuantity = totalQuantity;
            updates.grandTotal = grandTotal;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        const orderObj = updatedOrder.toObject();
        delete orderObj.paymentDetails;

        res.status(200).json({
            success: true,
            order: orderObj,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Update Order Error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByIdAndDelete(id);

        if (!order) return res.status(404).json({ 
            success: false,
            error: 'Order not found' 
        });

        res.status(200).json({ 
            success: true,
            message: 'Order deleted successfully' 
        });
    } catch (error) {
        console.error('Delete Order Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal Server Error',
            message: error.message 
        });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, paymentStatus, transactionId } = req.body;

        if (!orderId || !paymentStatus) {
            return res.status(400).json({
                success: false,
                error: 'Missing orderId or paymentStatus'
            });
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            {
                paymentStatus,
                $set: {
                    'paymentDetails.transactionId': transactionId,
                    'paymentDetails.paymentDate': new Date()
                }
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            orderId: order._id,
            paymentStatus: order.paymentStatus
        });

    } catch (error) {
        console.error('Update Payment Status Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

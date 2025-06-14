const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true },
    country: { type: String, required: true }
  },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  totalProducts: { type: Number, required: true },
  totalQuantity: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  shippingMethod: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  paymentStatus: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Paid', 'Unpaid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Processing'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

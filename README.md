# 🏨 Hotel Platform

[![Deployment Status](https://img.shields.io/badge/Deploy-Render.com-blue?style=flat-square)](https://render.com)
[![Django](https://img.shields.io/badge/Django-5.2.4-green?style=flat-square&logo=django)](https://djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.2.0-blue?style=flat-square&logo=mui)](https://mui.com/)

**Modern Hotel Management Platform** với Django REST API backend và React frontend

## 🌟 Features

### 🏢 **Management System**
- **🏨 Room Management**: Quản lý phòng, loại phòng, pricing
- **📅 Booking System**: Đặt phòng, check-in/out, payment processing  
- **👥 Customer Management**: Profile khách hàng, booking history
- **👨‍💼 Staff Management**: Quản lý nhân viên, permissions
- **📊 Analytics Dashboard**: Báo cáo doanh thu, occupancy rates

### 🎯 **Smart Features**
- **🔍 Intelligent Search**: Filter phòng theo price, guests, date
- **💰 Dynamic Pricing**: Tự động tính phụ thu cho extra guests
- **📱 Responsive Design**: Mobile-first UI với Material-UI
- **🔔 Real-time Notifications**: WebSocket notifications
- **📸 Image Management**: Cloudinary integration cho room photos

### 🔒 **Security & Authentication**
- **🔐 JWT Authentication**: Secure API access
- **👮‍♂️ Role-based Permissions**: Admin, Staff, Customer roles
- **🛡️ CORS Protection**: Production-ready security
- **🔒 Environment Variables**: Secure configuration management

## 🚀 Quick Start

### 📋 Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL/PostgreSQL
- Git

### 🔧 Local Development

1. **Clone Repository**
```bash
git clone https://github.com/NamNguyen1909/hotel-platform.git
cd hotel-platform
```

2. **Backend Setup**
```bash
cd hotelplatformapi
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations and seed data
python manage.py migrate
python manage.py seed
python manage.py runserver
```

3. **Frontend Setup**
```bash
cd hotelplatformweb-vite
npm install
npm run dev
```

### 🌐 Access URLs
- **🎯 Frontend**: http://localhost:5173
- **🔧 API**: http://localhost:8000
- **👨‍💻 Admin**: http://localhost:8000/admin
- **📚 API Docs**: http://localhost:8000/swagger

## 🏗️ Architecture

```
hotel-platform/
├── 🗄️ hotelplatformapi/          # Django Backend
│   ├── 🏨 hotelplatform/         # Main app
│   │   ├── 📋 models.py          # Database models  
│   │   ├── 🔌 views.py           # API endpoints
│   │   ├── 📝 serializers.py     # Data serialization
│   │   └── 🔒 permissions.py     # Access control
│   ├── ⚙️ hotelplatformapi/      # Project settings
│   └── 📦 requirements.txt       # Python dependencies
│
├── 🎨 hotelplatformweb-vite/     # React Frontend
│   ├── 📱 src/
│   │   ├── 🧩 components/        # Reusable components
│   │   ├── 📄 pages/             # Page components
│   │   ├── 🔧 services/          # API services
│   │   └── 🎨 theme/             # Material-UI theme
│   └── 📦 package.json           # Node dependencies
│
├── 🚀 render.yaml                # Deployment config
├── 📚 DEPLOYMENT.md              # Deploy guide
└── 📋 README.md                  # This file
```

## 🎯 Tech Stack

### 🗄️ **Backend**
- **Django 5.2.4**: Web framework
- **Django REST Framework**: API development
- **PostgreSQL/MySQL**: Database
- **JWT**: Authentication
- **Cloudinary**: Image storage
- **Swagger**: API documentation

### 🎨 **Frontend** 
- **React 19.1.0**: UI library
- **Material-UI 7.2.0**: Component library
- **Vite**: Build tool
- **Axios**: HTTP client
- **React Router**: Navigation

### 🚀 **Deployment**
- **Render.com**: Cloud hosting
- **PostgreSQL**: Production database
- **WhiteNoise**: Static file serving
- **Gunicorn**: WSGI server

## 🧮 Smart Pricing Algorithm

**Thuật toán "Fill Largest Rooms First"** để tối ưu phụ thu:

```python
# Ví dụ: 10 khách + 3 phòng [max_guests: 4, 2, 2]
# Bước 1: Sắp xếp [4, 2, 2] 
# Bước 2: Phân bổ ban đầu [4, 2, 2] (dư 2 khách)
# Bước 3: Phân bổ đều khách dư [+1, +1, +0] → [5, 3, 2]
# Bước 4: Phụ thu [25%, 25%, 0%]
```

## 📊 Admin Features

### 🏨 **Hotel Management**
- **Dashboard tổng quan**: Occupancy, revenue, bookings
- **Room management**: CRUD operations, pricing
- **Customer insights**: Booking patterns, preferences
- **Staff controls**: Role assignment, performance

### 📈 **Analytics & Reporting**  
- **Revenue analysis**: Daily/monthly/yearly reports
- **Occupancy rates**: Room utilization statistics
- **Customer segmentation**: VIP, regular, new customers
- **Performance metrics**: Staff productivity, response times

### ⚙️ **System Configuration**
- **Discount codes**: Promotional campaign management
- **Email templates**: Automated communications
- **Payment settings**: Gateway configuration
- **Backup & restore**: Data management tools

## 🚀 Deployment

### 🌐 **Auto Deploy với Render.com**

1. **Push code to GitHub**
2. **Connect Render.com account**  
3. **Import repository**
4. **Configure environment variables**
5. **Deploy automatically** 🎉

**Render sẽ tự động:**
- ✅ Setup PostgreSQL database
- ✅ Build Django backend
- ✅ Build React frontend  
- ✅ Run migrations & seed data
- ✅ Configure SSL certificates

📖 **Chi tiết**: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nam Nguyen** - [GitHub](https://github.com/NamNguyen1909)

---

<div align="center">

**🏨 Built with ❤️ for modern hotel management**

[![⭐ Star this project](https://img.shields.io/github/stars/NamNguyen1909/hotel-platform?style=social)](https://github.com/NamNguyen1909/hotel-platform)

</div>
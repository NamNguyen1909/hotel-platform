# 🏨 Hotel Platform Management System

[![Deployment Status](https://img.shields.io/badge/Deploy-Render.com-blue?style=flat-square)](https://render.com)
[![Django](https://img.shields.io/badge/Django-5.2.4-green?style=flat-square&logo=django)](https://djangoproject.com/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-7.2.0-blue?style=flat-square&logo=mui)](https://mui.com/)

## Table of Contents
- [Introduction](#introduction)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Architecture](#architecture)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Automated Task Scheduling](#automated-task-scheduling)
- [Deployment](#deployment)
- [License](#license)
- [Contributing](#contributing)
- [Contact](#contact)

## Introduction
The **Hotel Platform Management System** is a comprehensive solution designed to streamline hotel operations and enhance guest experiences. Built with modern technologies, it provides a robust platform for managing reservations, rooms, customers, staff, and revenue analytics. The system features an intuitive web interface, secure payment processing, and automated task scheduling for optimal operational efficiency.

### Key Features
- **Room Management**: Complete CRUD operations for rooms, room types, pricing, and availability tracking
- **Booking System**: Seamless reservation process with real-time availability checking and automated status updates
- **Customer Management**: Comprehensive guest profiles with booking history, preferences, and loyalty tracking
- **Staff Management**: Role-based access control for administrators, staff, and managers
- **Payment Integration**: Secure payment processing with VNPay integration
- **Revenue Analytics**: Advanced reporting with visual dashboards for occupancy rates, revenue analysis, and performance metrics
- **Automated Operations**: Scheduled tasks for room status updates, booking confirmations, and notification management
- **Smart Pricing**: Dynamic pricing algorithm with extra guest surcharges and promotional discount codes
- **Real-time Notifications**: WebSocket-based notifications for booking updates and system alerts
- **Image Management**: Cloudinary integration for efficient room photo storage and delivery

## Technologies Used
### 🗄️ **Backend**
- **Django 5.2.4** & **Django REST Framework**: Robust RESTful API development with comprehensive data validation and serialization
- **PostgreSQL**: Production-grade relational database for data persistence and complex queries
- **JWT Authentication**: Secure token-based authentication with role-based permissions
- **Cloudinary**: Cloud-based image storage and optimization service
- **Gunicorn**: Production WSGI HTTP server for Django applications

### 🎨 **Frontend** 
- **React 19.1.0**: Modern UI library with hooks and functional components
- **Material-UI 7.2.0**: Comprehensive component library with responsive design
- **Vite**: Fast build tool with hot module replacement for development
- **Axios**: Promise-based HTTP client for API communication
- **React Router**: Declarative routing for single-page application navigation

### 💳 **Payment Integration**
- **VNPay**: Vietnamese payment gateway for secure transaction processing

### 🔔 **Notifications & Scheduling**
- **WebSocket**: Real-time bidirectional communication for live notifications
- **Cron-job.org**: External cron service for automated task scheduling and execution

### 🚀 **Hosting & Deployment**
- **Render.com**: Cloud platform for hosting both backend and frontend services
- **PostgreSQL on Render**: Managed database service with automatic backups
- **WhiteNoise**: Static file serving for Django in production

### �️ **Development Tools**
- **Concurrently**: Tool for running multiple development servers simultaneously
- **Monorepo Architecture**: Single repository structure for coordinated development
- **Environment Variables**: Secure configuration management for different environments

## Features
### 🏢 **Core Management System**
- **Room Management**: Complete inventory control with room types, pricing tiers, and availability calendars
- **Booking Operations**: End-to-end reservation process from search to check-out with automated confirmations
- **Customer Relationship Management**: Guest profiles with booking history, preferences, and segmentation (VIP, regular, new)
- **Staff Administration**: Role-based access control with permissions for different operational levels
- **Financial Management**: Revenue tracking, payment processing, and automated invoice generation

### 🎯 **Smart Features**
- **Intelligent Search & Filtering**: Advanced search by price range, guest capacity, dates, and amenities
- **Dynamic Pricing Algorithm**: "Fill Largest Rooms First" strategy for optimal revenue and guest satisfaction
- **Automated Status Management**: Daily room status updates and booking confirmation workflows
- **Promotional System**: Flexible discount code creation with customer segment targeting
- **Analytics Dashboard**: Real-time insights into occupancy rates, revenue trends, and operational metrics

### 🔒 **Security & Performance**
- **Comprehensive Authentication**: JWT-based security with role-based access control
- **API Rate Limiting**: Protection against abuse with request throttling
- **CORS Configuration**: Secure cross-origin resource sharing for production deployment
- **Environment-based Configuration**: Separate settings for development, staging, and production
- **Automated Backup**: Scheduled database backups and data integrity checks

## Architecture

### **🎯 Monorepo Structure**
```
hotel-platform/                    # 📁 Single Repository
├── 🎯 hotelplatformapi/           # Django REST API Backend
│   ├── manage.py                  # Django management commands
│   ├── requirements.txt           # Python dependencies
│   ├── test_room_status_task.py   # Automated testing script
│   ├── hotelplatform/             # Main Django application
│   │   ├── models.py              # Database models
│   │   ├── views.py               # API endpoints & business logic
│   │   ├── serializers.py         # Data serialization
│   │   ├── permissions.py         # Access control & security
│   │   ├── signals.py             # Database event handlers
│   │   ├── admin.py               # Admin interface configuration
│   │   └── management/commands/   # Custom Django commands
│   └── hotelplatformapi/          # Project configuration
│       ├── settings.py            # Application settings
│       ├── urls.py                # URL routing
│       └── wsgi.py                # WSGI application
├── 🌐 hotelplatformweb-vite/      # React Frontend
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js             # Build configuration
│   ├── src/                       # React source code
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page-level components
│   │   ├── services/              # API service layer
│   │   ├── hooks/                 # Custom React hooks
│   │   └── theme/                 # Material-UI theme configuration
│   └── public/                    # Static assets
├── 📦 package.json                # Root workspace configuration
├── 🔧 render.yaml                 # Deployment configuration
├── 📚 DEPLOYMENT.md              # Deployment guide
└── � README.md                   # Project documentation
```

### **⚡ Development Workflow**
The system uses a **monorepo architecture** with **Concurrently** for streamlined development:

```bash
# 🎯 Traditional approach (requires 2 terminals):
Terminal 1: cd hotelplatformapi && python manage.py runserver
Terminal 2: cd hotelplatformweb-vite && npm run dev

# ✨ Monorepo approach (single command):
npm run dev  # → Automatically starts both backend and frontend!
```

**Benefits of Monorepo:**
- 🚀 **Unified Development**: Single command starts entire application
- 🔄 **Synchronized Versioning**: Coordinated releases and dependency management
- 📊 **Centralized Documentation**: All project information in one place
- 🔗 **Shared Configuration**: Common tooling and standards across projects

## Setup Instructions
### Prerequisites
- **Python 3.11+**: Backend development and Django framework
- **Node.js 18+**: Frontend development and build tools
- **PostgreSQL 13+**: Database for production (MySQL also supported)
- **Git**: Version control and repository management
- **Render.com account**: For production deployment (optional)
- **VNPay merchant account**: For payment processing (optional for development)
- **Cloudinary account**: For image storage (optional for development)

### Backend Setup
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/NamNguyen1909/hotel-platform.git
   cd hotel-platform/hotelplatformapi
   ```

2. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the `hotelplatformapi` directory:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/hotel_platform_db
   
   # Django Settings
   SECRET_KEY=your-django-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   
   # Payment Integration
   VNPAY_TMN_CODE=your-vnpay-tmn-code
   VNPAY_HASH_SECRET=your-vnpay-hash-secret-key
   VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   
   # Cloud Services
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   
   # Automation
   CRON_API_KEY=hotel-platform-cron-2025
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:5173
   ```
   
   **Note**: For local development, you can use SQLite by omitting `DATABASE_URL`. The project will automatically configure SQLite for development.

5. **Database Setup**:
   ```bash
   # Run migrations
   python manage.py migrate
   
   # Create superuser (optional)
   python manage.py createsuperuser
   
   # Seed initial data (optional)
   python manage.py seed
   ```

6. **Start Development Server**:
   ```bash
   python manage.py runserver
   ```
   - **API Base URL**: `http://localhost:8000/api/`
   - **Admin Interface**: `http://localhost:8000/admin/`
   - **API Documentation**: `http://localhost:8000/swagger/`

### Frontend Setup
1. **Navigate to Frontend Directory**:
   ```bash
   cd ../hotelplatformweb-vite
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the `hotelplatformweb-vite` directory:
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_BASE_URL=http://localhost:8000
   
   # Payment Configuration
   VITE_VNPAY_RETURN_URL=http://localhost:5173/payment-result
   
   # Application Settings
   VITE_APP_NAME=Hotel Platform
   VITE_APP_VERSION=1.0.0
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   - **Frontend URL**: `http://localhost:5173`
   - **Hot Reload**: Enabled for development

### Monorepo Development (Recommended)
For streamlined development, use the root-level commands:

1. **Install All Dependencies**:
   ```bash
   cd hotel-platform
   npm run install:all
   ```

2. **Start Full Application**:
   ```bash
   npm run dev
   ```
   This command will:
   - Start Django backend on `http://localhost:8000`
   - Start React frontend on `http://localhost:5173`
   - Display color-coded logs for easy debugging

3. **Other Useful Commands**:
   ```bash
   npm run build:frontend    # Build frontend for production
   npm run migrate          # Run Django migrations
   npm run seed            # Seed database with sample data
   npm run collectstatic   # Collect static files for production
   ```

### Testing the Automation System
The project includes automated room status management. To test the automation:

```bash
cd hotelplatformapi
python test_room_status_task.py
```

This script will:
- Create test bookings with different scenarios
- Call the room status update function
- Verify that room statuses are updated correctly
- Test security with API key validation
- Clean up test data automatically
## API Endpoints

### Authentication
- `POST /api/auth/login/`: User authentication with JWT token generation
- `POST /api/auth/register/`: User registration for customers
- `POST /api/auth/refresh/`: JWT token refresh
- `POST /api/auth/logout/`: User logout and token invalidation

### Users & Profiles
- `GET /api/users/`: Retrieve all users (admin only)
- `POST /api/users/`: Create new user account
- `GET /api/users/profile/`: Get current user profile
- `PUT /api/users/profile/`: Update user profile information
- `PATCH /api/users/profile/`: Partially update user profile
- `POST /api/users/change-password/`: Change user password
- `GET /api/users/{id}/bookings/`: Get user's booking history

### Rooms & Room Types
- `GET /api/rooms/`: List all available rooms with filtering
- `POST /api/rooms/`: Create new room (admin/staff only)
- `GET /api/rooms/{id}/`: Get detailed room information
- `PUT /api/rooms/{id}/`: Update room details (admin/staff only)
- `DELETE /api/rooms/{id}/`: Delete room (admin only)
- `GET /api/room-types/`: List all room types
- `POST /api/room-types/`: Create new room type (admin only)
- `GET /api/rooms/search/`: Advanced room search with filters

### Bookings & Reservations
- `GET /api/bookings/`: List all bookings (admin/staff only)
- `POST /api/bookings/`: Create new booking
- `GET /api/bookings/{id}/`: Get booking details
- `PUT /api/bookings/{id}/`: Update booking (admin/staff only)
- `PATCH /api/bookings/{id}/`: Partially update booking
- `DELETE /api/bookings/{id}/`: Cancel booking
- `POST /api/bookings/{id}/check-in/`: Process guest check-in
- `POST /api/bookings/{id}/check-out/`: Process guest check-out
- `GET /api/bookings/my-bookings/`: Get current user's bookings

### Payments & Transactions
- `GET /api/payments/`: List all payments (admin only)
- `POST /api/payments/vnpay-create/`: Create VNPay payment URL
- `GET /api/payments/vnpay-return/`: Handle VNPay payment return
- `POST /api/payments/vnpay-ipn/`: VNPay Instant Payment Notification webhook
- `GET /api/payments/{id}/`: Get payment details
- `POST /api/payments/{id}/refund/`: Process payment refund (admin only)

### Analytics & Reports
- `GET /api/analytics/dashboard/`: Get dashboard statistics (admin/staff only)
- `GET /api/analytics/revenue/`: Revenue analytics with date filtering
- `GET /api/analytics/occupancy/`: Room occupancy statistics
- `GET /api/analytics/bookings/`: Booking analytics and trends
- `GET /api/analytics/customers/`: Customer analytics and segmentation

### Discount Codes & Promotions
- `GET /api/discounts/`: List all discount codes (admin/staff only)
- `POST /api/discounts/`: Create new discount code (admin only)
- `GET /api/discounts/{code}/validate/`: Validate discount code
- `PUT /api/discounts/{id}/`: Update discount code (admin only)
- `DELETE /api/discounts/{id}/`: Delete discount code (admin only)

### System & Automation
- `POST /api/tasks/update-room-status/`: Automated room status update (cron job)
- `GET /api/tasks/status/`: Get system task status
- `GET /api/health/`: Health check endpoint
- `GET /api/version/`: Get API version information

## Automated Task Scheduling

The system includes automated task scheduling for operational efficiency:

### Room Status Automation
**Endpoint**: `POST /api/tasks/update-room-status/`

**Purpose**: Automatically updates room statuses and booking confirmations daily

**Functionality**:
- Updates room status from "available" to "booked" for confirmed bookings on check-in date
- Marks overdue bookings as "no-show" and releases associated rooms
- Processes future bookings without affecting their status
- Provides detailed logging and error reporting

**Security**: Protected with API key authentication (`X-API-Key` header)

**Cron Schedule**: 
```bash
# Daily at 6:00 AM UTC (1:00 PM Vietnam time)
0 6 * * *
```

**Implementation via Cron-job.org**:
```bash
# Cron job configuration
URL: https://hotel-platform-api.onrender.com/api/tasks/update-room-status/
Method: POST
Headers: 
  Content-Type: application/json
  X-API-Key: hotel-platform-cron-2025
Body: 
{
  "api_key": "hotel-platform-cron-2025",
  "trigger": "scheduled",
  "timestamp": "2025-01-01T06:00:00Z"
}
```

**Testing**: Use the included test script to validate automation:
```bash
cd hotelplatformapi
python test_room_status_task.py
```

**Response Format**:
```json
{
  "success": true,
  "message": "Room status update completed successfully",
  "timestamp": "2025-01-01T06:00:00Z",
  "summary": {
    "total_rooms_updated": 5,
    "bookings_processed": 8,
    "no_show_bookings": 2,
    "errors_count": 0
  },
  "updated_rooms": [
    {
      "room_number": "101",
      "booking_id": 123,
      "old_status": "available",
      "new_status": "booked",
      "check_in_date": "2025-01-01T14:00:00Z"
    }
  ]
}
```

## Deployment

### Production Deployment with Render.com

The application is configured for automatic deployment on Render.com with the following setup:

#### Backend Deployment
1. **Repository Connection**: Connect GitHub repository to Render.com
2. **Service Configuration**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn hotelplatformapi.wsgi:application`
   - **Environment**: Python 3.11+

3. **Environment Variables Configuration**:
   ```env
   # Production Database
   DATABASE_URL=postgresql://user:pass@host:port/dbname
   
   # Django Production Settings
   SECRET_KEY=production-secret-key
   DEBUG=False
   ALLOWED_HOSTS=hotel-platform-api.onrender.com
   
   # Payment Integration
   VNPAY_TMN_CODE=production-vnpay-code
   VNPAY_HASH_SECRET=production-vnpay-secret
   VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
   
   # Cloud Services
   CLOUDINARY_CLOUD_NAME=production-cloud-name
   CLOUDINARY_API_KEY=production-api-key
   CLOUDINARY_API_SECRET=production-api-secret
   
   # CORS Configuration
   FRONTEND_URL=https://hotel-platform-web.onrender.com
   
   # Automation
   CRON_API_KEY=hotel-platform-cron-2025
   ```

#### Frontend Deployment
1. **Service Configuration**:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: Node.js 18+

2. **Environment Variables**:
   ```env
   VITE_API_BASE_URL=https://hotel-platform-api.onrender.com/api
   VITE_BASE_URL=https://hotel-platform-api.onrender.com
   VITE_VNPAY_RETURN_URL=https://hotel-platform-web.onrender.com/payment-result
   ```

#### Database Setup
- **PostgreSQL**: Automatically provisioned by Render.com
- **Migrations**: Run automatically during deployment
- **Backups**: Automated daily backups included

#### Cron Job Configuration
Set up automated tasks on **cron-job.org**:
1. Create account on cron-job.org
2. Add new cron job with:
   - **URL**: `https://hotel-platform-api.onrender.com/api/tasks/update-room-status/`
   - **Schedule**: `0 6 * * *` (daily at 6 AM UTC)
   - **Method**: POST
   - **Headers**: `X-API-Key: hotel-platform-cron-2025`

#### Access URLs
- **Frontend**: https://hotel-platform-web.onrender.com
- **API**: https://hotel-platform-api.onrender.com/api
- **Admin Panel**: https://hotel-platform-api.onrender.com/admin

### Local Development Deployment
For local testing of production-like environment:

```bash
# Backend with production settings
cd hotelplatformapi
export DEBUG=False
export DATABASE_URL=postgresql://localhost/hotel_platform_prod
python manage.py collectstatic --noinput
gunicorn hotelplatformapi.wsgi:application

# Frontend production build
cd hotelplatformweb-vite
npm run build
npm run preview
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing
Contributions are welcome! To contribute:

1. **Fork the Repository**:
   ```bash
   git clone https://github.com/NamNguyen1909/hotel-platform.git
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**:
   - Follow the existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**:
   ```bash
   # Test backend
   cd hotelplatformapi
   python manage.py test
   
   # Test frontend
   cd hotelplatformweb-vite
   npm run test
   
   # Test automation
   python test_room_status_task.py
   ```

5. **Commit and Push**:
   ```bash
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **Submit Pull Request**: Create a pull request with a clear description of changes

### Development Guidelines
- **Code Style**: Follow PEP 8 for Python, ESLint rules for JavaScript
- **Testing**: Write unit tests for new API endpoints and components
- **Documentation**: Update README and inline documentation for new features
- **Environment**: Test in both development and production-like environments

## Contact
For inquiries, support, or collaboration opportunities, please contact:

- **Nam Nguyen**: namnguyen19092004@gmail.com
- **Phu Nguyen**: npphus@gmail.com

### Project Links
- **Repository**: [GitHub](https://github.com/NamNguyen1909/hotel-platform)
- **Live Demo**: [Hotel Platform](https://hotel-platform-web.onrender.com)
- **API Documentation**: [API Docs](https://hotel-platform-api.onrender.com/swagger)

---

<div align="center">

**🏨 Built with ❤️ for modern hotel management**

[![⭐ Star this project](https://img.shields.io/github/stars/NamNguyen1909/hotel-platform?style=social)](https://github.com/NamNguyen1909/hotel-platform)

</div>
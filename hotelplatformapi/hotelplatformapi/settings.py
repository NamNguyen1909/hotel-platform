"""
Django settings for hotelplatformapi project.

Generated by 'django-admin startproject' using Django 5.2.4.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv() # Load environment variables from .env file


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-q+k0%wy3_kxy&)egzf^lmf$hzn0u*zzx--55&5u8f=)^lf2yas'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'hotelplatform.apps.HotelplatformConfig',
    'drf_yasg', # Swagger
    'rest_framework', # Django REST Framework
    'rest_framework_simplejwt',  # JWT authentication
    'rest_framework_simplejwt.token_blacklist',  # JWT blacklist
    'oauth2_provider', # Django OAuth Toolkit
    'corsheaders', # CORS headers
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS middleware
    'oauth2_provider.middleware.OAuth2TokenMiddleware',  # OAuth2 middleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hotelplatformapi.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'hotelplatformapi.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {

    # 'default': dj_database_url.config(
    #     default=os.getenv('DATABASE_URL'),
    #     conn_max_age=600,
    #     ssl_require=True
    # )

    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'hoteldb',
        'USER': 'root',
        # 'PASSWORD': 'Admin@123',
        # 'PASSWORD': 'ThanhNam*1909',
        'PASSWORD': os.getenv('DB_PASSWORD'),  # Lấy từ biến môi trường

        'HOST': '' # mặc định localhost
    }

}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



AUTH_USER_MODEL = 'hotelplatform.User'

import cloudinary
cloudinary.config(

    # cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    # api_key=os.getenv('CLOUDINARY_API_KEY'),
    # api_secret=os.getenv('CLOUDINARY_API_SECRET'),

    cloud_name="dncgine9e",
    api_key="257557947612624",
    api_secret="88EDQ7-Ltwzn1oaI4tT_UIb_bWI",

    secure=True
)
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

STATICFILES_STORAGE = 'cloudinary_storage.storage.StaticCloudinaryStorage'

# OAuth2 Settings (sử dụng token bình thường)
OAUTH2_PROVIDER = {
    'SCOPES': {
        'read': 'Read scope',
        'write': 'Write scope',
    },
    'ACCESS_TOKEN_EXPIRE_SECONDS': 3600,  # 1 hour
    'REFRESH_TOKEN_EXPIRE_SECONDS': 3600 * 24 * 7,  # 7 days
    'AUTHORIZATION_CODE_EXPIRE_SECONDS': 600,  # 10 minutes
    'ROTATE_REFRESH_TOKEN': True,
    
    # Thêm dòng này để hỗ trợ password grant type
    'APPLICATION_MODEL': 'oauth2_provider.Application',
    'GRANT_TYPES': {
        'authorization-code': 'oauth2_provider.grant_types.AuthorizationCodeGrantType',
        'password': 'oauth2_provider.grant_types.ResourceOwnerPasswordCredentialsGrantType',
        'client-credentials': 'oauth2_provider.grant_types.ClientCredentialsGrantType',
        'refresh-token': 'oauth2_provider.grant_types.RefreshTokenGrantType',
    },

    'RESOURCE_SERVER_INTROSPECTION_URL': None,
    'RESOURCE_SERVER_AUTH_TOKEN': None,
    'RESOURCE_SERVER_INTROSPECTION_CREDENTIALS': None,
}

# JWT Settings cho Simple JWT (mobile app, direct API access)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',

    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=60),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

# REST Framework với dual authentication
REST_FRAMEWORK = {
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',    # JWT
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',  # OAuth2
        'rest_framework.authentication.SessionAuthentication',          # Session
    ],
    
    # 'DEFAULT_PERMISSION_CLASSES': [
    #     'rest_framework.permissions.IsAuthenticated',
    # ],
    
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

CORS_ALLOW_ALL_ORIGINS = True # Cho phép tất cả các nguồn gốc

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # React dev server
    'http://localhost:5173',  # Vite dev server

]

CLIENT_ID='kycIFibcgbEopjJ9esSVPU5PTECw6z4jAqMZ5j9w'
CLIENT_SECRECT='TI8kzKgylZvAmqmSoi0SpgYt4z0pBS3SzNEEEPey0tVpYXRBQJgfrsYQzakk433ONKTc8WF9q3FnZR0XtDI1aOkj5bsIJcL9hZvpHaxJH9vXOUklrGXaiPivlJPOYuN4'


# Cho Mobile App / Direct API: Sử dụng Simple JWT
# POST /api/auth/token/
# {
#     "username": "user@example.com",
#     "password": "password"
# }

# Cho Third-party Applications: Sử dụng OAuth2 flow
# POST /o/token/
# {
#     "grant_type": "authorization_code",
#     "code": "authorization_code",
#     "client_id": "your_client_id",
#     "client_secret": "your_client_secret"
# }


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'oauth2_provider': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
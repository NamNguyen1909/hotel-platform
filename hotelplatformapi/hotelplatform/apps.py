from django.apps import AppConfig


class HotelplatformConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hotelplatform'

    def ready(self):
        import hotelplatform.signals

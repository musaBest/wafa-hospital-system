FROM php:8.2-cli

# تثبيت الإضافات والمسارعات المطلوبة لتشغيل لارافيل وقاعدة البيانات
RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git libpng-dev libjpeg-dev libfreetype6-dev \
    && docker-php-ext-install pdo pdo_mysql zip

# تحميل وتثبيت الـ Composer داخل السيرفر تلقائياً
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# تحديد مجلد العمل داخل السيرفر
WORKDIR /app
COPY . .

# تثبيت مكتبات اللارافيل المتواجدة في composer.json
RUN composer install --no-dev --optimize-autoloader

# فتح المنفذ الذي يطلبه موقع Render
EXPOSE 10000

# أمر تشغيل سيرفر لارافيل الداخلي عند بدء الخدمة
CMD php artisan serve --host=0.0.0.0 --port=10000
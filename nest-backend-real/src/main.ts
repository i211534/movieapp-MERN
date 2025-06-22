import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestExpressApplication to enable static file serving
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS with more specific configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve static files (IMPORTANT: This is likely what's missing)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Alternative: serve from 'public' directory if that's where you store images
  // app.useStaticAssets(join(__dirname, '..', 'public'), {
  //   prefix: '/public/',
  // });

  // Global validation pipe with enhanced configuration
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    disableErrorMessages: process.env.NODE_ENV === 'production',
  }));

  // Global prefix for all routes (commented out for now)
  // app.setGlobalPrefix('api/v1');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Movie Recommendation API')
    .setDescription('A comprehensive movie recommendation API with user management, ratings, and personalized suggestions')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addServer('http://localhost:3001', 'Development')
    .addServer('https://your-api-domain.com', 'Production')
    .addTag('auth', 'Authentication and authorization endpoints')
    .addTag('movies', 'Movie management and search')
    .addTag('categories', 'Movie categories and genres')
    .addTag('users', 'User profile and account management')
    .addTag('ratings', 'Movie ratings and reviews')
    .addTag('recommendations', 'Personalized movie recommendations')
    .addTag('watchlist', 'User watchlist management')
    .setContact('Your Name', 'https://your-website.com', 'your-email@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Movie API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
  });

  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;

  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`🔗 API base URL: http://localhost:${port}/api/v1`);
  console.log(`📁 Static files served from: ${join(__dirname, '..', 'uploads')}`);

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 Environment: Development`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Error starting the application:', error);
  process.exit(1);
});
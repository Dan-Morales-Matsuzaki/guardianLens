# Use an official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy files into container
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir flask transformers torch accelerate

# Expose Hugging Face Spaces port
EXPOSE 7860

# Run Flask app
CMD ["python", "intent_service.py"]
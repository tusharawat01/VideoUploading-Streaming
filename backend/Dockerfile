FROM node:20

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg

# Install app dependencies
RUN npm install

# Copy app source to /usr/src/app
COPY ./ ./

# Expose port and start the application
EXPOSE 8000
CMD [ "npm", "run", "start" ]

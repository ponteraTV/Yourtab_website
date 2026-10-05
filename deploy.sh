#!/bin/bash
echo "Deploying YourTab to Production Server..."

# ১. গিটহাব থেকে নতুন কোড সার্ভারে নামানো
git pull origin main

# ২. ডকার (Docker) দিয়ে ডাটাবেস, ব্যাকএন্ড এবং ওয়েবসাইট চালু করা
docker compose -f docker-compose.yml up --build -d

echo "Deployment Successful! YourTab is now LIVE."

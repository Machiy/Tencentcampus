@echo off
git init
git add .
git commit -m "Initial commit"
git remote remove origin
git remote add origin https://github.com/Machiy/Tencentcampus.git
git branch -M main
git push -u origin main
del setup_git.bat

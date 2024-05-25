# 🐰 rabbitt
An AI. But not just any AI - an "agent" that can do tasks on your behalf. Fun weekend side project I made 😄 <br>
Inspiration from Rabbit's LAM, Large Action Model.

---

# 🛠️ How does it work?
```
+-------------------------------+
|  User inputs website &        |
|  instructions to do on        |
|  website                      |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| Axios retrieves website's     |
| HTML                          |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| Sends website's HTML to       |
| first Gemini AI               |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| First Gemini AI makes         |
| description of all IDs and    |
| attributes                    |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| Sends attributes and IDs to   |
| second Gemini AI              |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| Second Gemini AI makes        |
| playwright script along with  |
| user's instructions           |
+-------------+-----------------+
              |
              v
+-------------+-----------------+
| child_process executes        |
| playwright script             |
+-------------+-----------------+

```
---

# 🚀 How to set it up?
Easy peasy lemon squeezy! Just copy and paste these commands into your terminal:

```bash
git clone https://github.com/GikitSRC/rabbitt
cd rabbitt
npm init -y
npm install
npx playwright install
node server.js
```
Then, go to https://localhost:3000 on any web browser connected to the same WiFi! 😎

# 🌐 [ThriveOS](https://thriveos.pages.dev/)
Advertisement for a WebOS I made :) 

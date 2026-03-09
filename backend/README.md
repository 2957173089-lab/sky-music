# SkyMusic Backend

基于 Flask 的音乐应用后端服务，使用 SQLite 数据库存储用户数据。

## 功能特性

- ✅ 用户注册/登录/登出
- ✅ 歌单管理（创建、编辑、删除、歌曲增删）
- ✅ 收藏管理（喜欢/取消喜欢）
- ✅ 播放历史记录
- ✅ 跨设备数据同步
- ✅ 密码安全加密（SHA256 + 盐值）

## 环境要求

- Python 3.8+
- SQLite（Python 内置）

## 安装步骤

```bash
# 1. 克隆或进入项目目录
cd backend

# 2. 安装依赖
pip install -r requirements.txt

# 3. 初始化数据库
python init_db.py

# 4. 启动服务
python app.py
```

服务将在 `http://0.0.0.0:5000` 启动。

## API 接口文档

### 认证接口

#### 1. 用户注册
```
POST /api/auth/register
```
请求体：
```json
{
  "email": "user@example.com",
  "username": "用户名",
  "password": "密码"
}
```
响应：
```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "用户名"
  }
}
```

#### 2. 用户登录
```
POST /api/auth/login
```
请求体：
```json
{
  "email": "user@example.com",
  "password": "密码"
}
```
响应：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "username": "用户名",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

#### 3. 用户登出
```
POST /api/auth/logout
```
请求头：
```
X-User-ID: 1
```

#### 4. 获取用户资料
```
GET /api/auth/profile
```
请求头：
```
X-User-ID: 1
```

### 歌单接口

#### 1. 获取所有歌单
```
GET /api/playlists
```
请求头：
```
X-User-ID: 1
```

#### 2. 创建歌单
```
POST /api/playlists
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "name": "歌单名称",
  "description": "描述",
  "cover_url": "封面URL"
}
```

#### 3. 获取歌单详情
```
GET /api/playlists/{playlist_id}
```
请求头：
```
X-User-ID: 1
```

#### 4. 更新歌单
```
PUT /api/playlists/{playlist_id}
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "name": "新名称",
  "description": "新描述",
  "cover_url": "新封面URL"
}
```

#### 5. 删除歌单
```
DELETE /api/playlists/{playlist_id}
```
请求头：
```
X-User-ID: 1
```

#### 6. 添加歌曲到歌单
```
POST /api/playlists/{playlist_id}/songs
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "id": 123,
  "name": "歌曲名",
  "artist": "歌手",
  "album": "专辑",
  "cover": "封面URL",
  "duration": 180000
}
```

#### 7. 从歌单移除歌曲
```
DELETE /api/playlists/{playlist_id}/songs/{song_id}
```
请求头：
```
X-User-ID: 1
```

#### 8. 移动歌单内歌曲位置
```
PUT /api/playlists/{playlist_id}/songs/move
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "song_id": 123,
  "to_position": 2
}
```

### 收藏接口

#### 1. 获取所有收藏
```
GET /api/favorites
```
请求头：
```
X-User-ID: 1
```

#### 2. 添加收藏
```
POST /api/favorites
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "id": 123,
  "name": "歌曲名",
  "artist": "歌手",
  "album": "专辑",
  "cover": "封面URL",
  "duration": 180000
}
```

#### 3. 取消收藏
```
DELETE /api/favorites/{song_id}
```
请求头：
```
X-User-ID: 1
```

#### 4. 检查是否已收藏
```
GET /api/favorites/{song_id}
```
请求头：
```
X-User-ID: 1
```

### 播放历史接口

#### 1. 获取播放历史
```
GET /api/history?limit=50
```
请求头：
```
X-User-ID: 1
```

#### 2. 添加播放记录
```
POST /api/history
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "id": 123,
  "name": "歌曲名",
  "artist": "歌手",
  "album": "专辑",
  "cover": "封面URL",
  "duration": 180000
}
```

#### 3. 清空播放历史
```
POST /api/history/clear
```
请求头：
```
X-User-ID: 1
```

### 数据同步接口

#### 1. 同步数据到服务器
```
POST /api/sync
```
请求头：
```
X-User-ID: 1
```
请求体：
```json
{
  "favorites": [
    {
      "id": 123,
      "name": "歌曲名",
      "artist": "歌手",
      "album": "专辑",
      "cover": "封面URL",
      "duration": 180000
    }
  ],
  "playlists": [
    {
      "id": 1,
      "name": "歌单名",
      "songs": [...]
    }
  ],
  "history": [...]
}
```

#### 2. 获取服务器同步数据
```
GET /api/sync
```
请求头：
```
X-User-ID: 1
```

### 健康检查

```
GET /api/health
```
响应：
```json
{
  "code": 200,
  "message": "成功",
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00"
  }
}
```

## 部署指南

### 本地部署

```bash
cd backend
pip install -r requirements.txt
python init_db.py
python app.py
```

### 生产环境部署（推荐使用 Gunicorn）

```bash
# 安装 Gunicorn
pip install gunicorn

# 使用 Gunicorn 启动
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

构建并运行：
```bash
docker build -t skymusic-backend .
docker run -p 5000:5000 skymusic-backend
```

## 配置说明

### 环境变量

```bash
# 开发模式
export FLASK_ENV=development

# 端口
export PORT=5000
```

### 数据库路径

默认数据库路径为 `sky_music.db`，可在 `database.py` 中修改：

```python
DATABASE_PATH = 'sky_music.db'
```

## 安全建议

1. **生产环境**：将 `debug` 模式设为 `False`
2. **密码强度**：建议用户使用至少 8 位密码
3. **HTTPS**：生产环境建议使用 HTTPS
4. **CORS**：限制允许的源，不要使用 `*`
5. **定期备份**：定期备份 SQLite 数据库文件

## 常见问题

### Q: 如何重置数据库？
A: 删除 `sky_music.db` 文件后重新运行 `python init_db.py`

### Q: 如何查看数据库内容？
A: 使用 SQLite 浏览器或命令行：
```bash
sqlite3 sky_music.db
.tables
SELECT * FROM users;
```

### Q: 支持跨域请求吗？
A: 已启用 CORS，生产环境请限制允许的源。

## 许可证

MIT License

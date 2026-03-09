from flask import Flask, request, jsonify, g
from flask_cors import CORS
import database as db
import os
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 配置
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# 确保数据库存在
if not os.path.exists(db.DATABASE_PATH):
    db.init_db()

# 请求钩子
@app.before_request
def before_request():
    g.db = db.get_connection()

@app.teardown_request
def teardown_request(exception):
    if hasattr(g, 'db'):
        g.db.close()

# 辅助函数
def success_response(data=None, message='成功'):
    return jsonify({'code': 200, 'message': message, 'data': data})

def error_response(message='失败', code=400):
    return jsonify({'code': code, 'message': message, 'data': None})

def get_current_user():
    """从请求头获取当前用户"""
    user_id = request.headers.get('X-User-ID')
    if user_id:
        return g.db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    return None

def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

# ─────────────────────────────────────────────────────
# 用户认证接口
# ─────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        # 验证输入
        if not email or not username or not password:
            return error_response('邮箱、用户名和密码不能为空', 400)
        
        if not validate_email(email):
            return error_response('邮箱格式不正确', 400)
        
        if len(password) < 6:
            return error_response('密码长度至少为6位', 400)
        
        if len(username) > 20:
            return error_response('用户名不能超过20个字符', 400)
        
        # 生成盐值和密码哈希
        salt = db.generate_salt()
        password_hash = db.hash_password(password, salt)
        
        # 插入用户
        cursor = g.db.execute(
            'INSERT INTO users (email, username, password_hash, salt) VALUES (?, ?, ?, ?)',
            (email, username, password_hash, salt)
        )
        g.db.commit()
        
        return success_response({
            'user_id': cursor.lastrowid,
            'email': email,
            'username': username
        }, '注册成功')
        
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e):
            return error_response('该邮箱已被注册', 409)
        return error_response(f'注册失败: {str(e)}', 500)

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return error_response('邮箱和密码不能为空', 400)
        
        user = g.db.execute(
            'SELECT * FROM users WHERE email = ?',
            (email,)
        ).fetchone()
        
        if not user:
            return error_response('用户不存在', 404)
        
        if not db.verify_password(password, user['password_hash'], user['salt']):
            return error_response('密码错误', 401)
        
        # 更新最后登录时间
        g.db.execute(
            'UPDATE users SET last_login = ? WHERE id = ?',
            (datetime.now().isoformat(), user['id'])
        )
        g.db.commit()
        
        return success_response({
            'user_id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'created_at': user['created_at']
        }, '登录成功')
        
    except Exception as e:
        return error_response(f'登录失败: {str(e)}', 500)

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    return success_response(message='登出成功')

@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    """获取用户资料"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    return success_response({
        'user_id': user['id'],
        'email': user['email'],
        'username': user['username'],
        'created_at': user['created_at'],
        'last_login': user['last_login']
    })

# ─────────────────────────────────────────────────────
# 歌单接口
# ─────────────────────────────────────────────────────

@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    """获取用户所有歌单"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlists = g.db.execute(
        'SELECT * FROM playlists WHERE user_id = ? ORDER BY updated_at DESC',
        (user['id'],)
    ).fetchall()
    
    return success_response([dict(p) for p in playlists])

@app.route('/api/playlists', methods=['POST'])
def create_playlist():
    """创建歌单"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    data = request.get_json()
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    cover_url = data.get('cover_url', '')
    
    if not name:
        return error_response('歌单名称不能为空', 400)
    
    cursor = g.db.execute(
        'INSERT INTO playlists (user_id, name, description, cover_url) VALUES (?, ?, ?, ?)',
        (user['id'], name, description, cover_url)
    )
    g.db.commit()
    
    return success_response({'playlist_id': cursor.lastrowid}, '创建成功')

@app.route('/api/playlists/<int:playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    """获取歌单详情"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlist = g.db.execute(
        'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
        (playlist_id, user['id'])
    ).fetchone()
    
    if not playlist:
        return error_response('歌单不存在', 404)
    
    songs = g.db.execute(
        'SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY position',
        (playlist_id,)
    ).fetchall()
    
    return success_response({
        **dict(playlist),
        'songs': [dict(s) for s in songs]
    })

@app.route('/api/playlists/<int:playlist_id>', methods=['PUT'])
def update_playlist(playlist_id):
    """更新歌单"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlist = g.db.execute(
        'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
        (playlist_id, user['id'])
    ).fetchone()
    
    if not playlist:
        return error_response('歌单不存在', 404)
    
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    cover_url = data.get('cover_url')
    
    if name:
        g.db.execute(
            'UPDATE playlists SET name = ? WHERE id = ?',
            (name, playlist_id)
        )
    if description is not None:
        g.db.execute(
            'UPDATE playlists SET description = ? WHERE id = ?',
            (description, playlist_id)
        )
    if cover_url:
        g.db.execute(
            'UPDATE playlists SET cover_url = ? WHERE id = ?',
            (cover_url, playlist_id)
        )
    
    g.db.execute('UPDATE playlists SET updated_at = ? WHERE id = ?', (datetime.now().isoformat(), playlist_id))
    g.db.commit()
    
    return success_response(message='更新成功')

@app.route('/api/playlists/<int:playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    """删除歌单"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlist = g.db.execute(
        'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
        (playlist_id, user['id'])
    ).fetchone()
    
    if not playlist:
        return error_response('歌单不存在', 404)
    
    g.db.execute('DELETE FROM playlists WHERE id = ?', (playlist_id,))
    g.db.commit()
    
    return success_response(message='删除成功')

# ─────────────────────────────────────────────────────
# 歌单歌曲管理
# ─────────────────────────────────────────────────────

@app.route('/api/playlists/<int:playlist_id>/songs', methods=['POST'])
def add_song_to_playlist(playlist_id):
    """添加歌曲到歌单"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlist = g.db.execute(
        'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
        (playlist_id, user['id'])
    ).fetchone()
    
    if not playlist:
        return error_response('歌单不存在', 404)
    
    data = request.get_json()
    song_id = data.get('song_id')
    song_name = data.get('song_name')
    song_artist = data.get('song_artist')
    song_album = data.get('song_album', '')
    song_cover = data.get('song_cover', '')
    song_duration = data.get('song_duration', 0)
    
    if not all([song_id, song_name, song_artist]):
        return error_response('歌曲信息不完整', 400)
    
    # 检查是否已存在
    existing = g.db.execute(
        'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        (playlist_id, song_id)
    ).fetchone()
    
    if existing:
        return error_response('歌曲已存在于歌单中', 409)
    
    # 获取最大位置
    max_pos = g.db.execute(
        'SELECT MAX(position) as max_pos FROM playlist_songs WHERE playlist_id = ?',
        (playlist_id,)
    ).fetchone()['max_pos']
    position = (max_pos or 0) + 1
    
    g.db.execute(
        '''INSERT INTO playlist_songs 
           (playlist_id, song_id, song_name, song_artist, song_album, song_cover, song_duration, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (playlist_id, song_id, song_name, song_artist, song_album, song_cover, song_duration, position)
    )
    
    g.db.execute('UPDATE playlists SET song_count = song_count + 1, updated_at = ? WHERE id = ?',
                 (datetime.now().isoformat(), playlist_id))
    g.db.commit()
    
    return success_response(message='添加成功')

@app.route('/api/playlists/<int:playlist_id>/songs/<int:song_id>', methods=['DELETE'])
def remove_song_from_playlist(playlist_id, song_id):
    """从歌单移除歌曲"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    song = g.db.execute(
        'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        (playlist_id, song_id)
    ).fetchone()
    
    if not song:
        return error_response('歌曲不在歌单中', 404)
    
    g.db.execute('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
                 (playlist_id, song_id))
    
    # 更新位置
    g.db.execute('''
        UPDATE playlist_songs 
        SET position = position - 1 
        WHERE playlist_id = ? AND position > ?
    ''', (playlist_id, song['position']))
    
    g.db.execute('UPDATE playlists SET song_count = MAX(0, song_count - 1), updated_at = ? WHERE id = ?',
                 (datetime.now().isoformat(), playlist_id))
    g.db.commit()
    
    return success_response(message='移除成功')

@app.route('/api/playlists/<int:playlist_id>/songs/move', methods=['PUT'])
def move_song_in_playlist(playlist_id):
    """移动歌单中的歌曲位置"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    data = request.get_json()
    song_id = data.get('song_id')
    to_position = data.get('to_position')
    
    song = g.db.execute(
        'SELECT * FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
        (playlist_id, song_id)
    ).fetchone()
    
    if not song:
        return error_response('歌曲不在歌单中', 404)
    
    from_position = song['position']
    
    if to_position > from_position:
        g.db.execute('''
            UPDATE playlist_songs 
            SET position = position - 1 
            WHERE playlist_id = ? AND position > ? AND position <= ?
        ''', (playlist_id, from_position, to_position))
    else:
        g.db.execute('''
            UPDATE playlist_songs 
            SET position = position + 1 
            WHERE playlist_id = ? AND position >= ? AND position < ?
        ''', (playlist_id, to_position, from_position))
    
    g.db.execute('UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND song_id = ?',
                 (to_position, playlist_id, song_id))
    g.db.commit()
    
    return success_response(message='移动成功')

# ─────────────────────────────────────────────────────
# 收藏接口
# ─────────────────────────────────────────────────────

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    """获取用户收藏"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    favorites = g.db.execute(
        'SELECT * FROM favorites WHERE user_id = ? ORDER BY added_at DESC',
        (user['id'],)
    ).fetchall()
    
    return success_response([dict(f) for f in favorites])

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    """添加收藏"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    data = request.get_json()
    song_id = data.get('song_id')
    song_name = data.get('song_name')
    song_artist = data.get('song_artist')
    song_album = data.get('song_album', '')
    song_cover = data.get('song_cover', '')
    song_duration = data.get('song_duration', 0)
    
    if not all([song_id, song_name, song_artist]):
        return error_response('歌曲信息不完整', 400)
    
    # 检查是否已收藏
    existing = g.db.execute(
        'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
        (user['id'], song_id)
    ).fetchone()
    
    if existing:
        return error_response('已收藏', 409)
    
    g.db.execute(
        '''INSERT INTO favorites 
           (user_id, song_id, song_name, song_artist, song_album, song_cover, song_duration)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (user['id'], song_id, song_name, song_artist, song_album, song_cover, song_duration)
    )
    g.db.commit()
    
    return success_response(message='收藏成功')

@app.route('/api/favorites/<int:song_id>', methods=['DELETE'])
def remove_favorite(song_id):
    """取消收藏"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    favorite = g.db.execute(
        'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
        (user['id'], song_id)
    ).fetchone()
    
    if not favorite:
        return error_response('未收藏该歌曲', 404)
    
    g.db.execute('DELETE FROM favorites WHERE user_id = ? AND song_id = ?', (user['id'], song_id))
    g.db.commit()
    
    return success_response(message='取消收藏')

@app.route('/api/favorites/<int:song_id>', methods=['GET'])
def check_favorite(song_id):
    """检查是否已收藏"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    favorite = g.db.execute(
        'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
        (user['id'], song_id)
    ).fetchone()
    
    return success_response({'is_liked': favorite is not None})

# ─────────────────────────────────────────────────────
# 播放历史接口
# ─────────────────────────────────────────────────────

@app.route('/api/history', methods=['GET'])
def get_history():
    """获取播放历史"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    limit = request.args.get('limit', 50, type=int)
    history = g.db.execute(
        'SELECT * FROM play_history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?',
        (user['id'], limit)
    ).fetchall()
    
    return success_response([dict(h) for h in history])

@app.route('/api/history', methods=['POST'])
def add_history():
    """添加播放记录"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    data = request.get_json()
    song_id = data.get('song_id')
    song_name = data.get('song_name')
    song_artist = data.get('song_artist')
    song_album = data.get('song_album', '')
    song_cover = data.get('song_cover', '')
    song_duration = data.get('song_duration', 0)
    
    if not all([song_id, song_name, song_artist]):
        return error_response('歌曲信息不完整', 400)
    
    # 删除重复记录
    g.db.execute('DELETE FROM play_history WHERE user_id = ? AND song_id = ?', (user['id'], song_id))
    
    # 插入新记录
    g.db.execute(
        '''INSERT INTO play_history 
           (user_id, song_id, song_name, song_artist, song_album, song_cover, song_duration)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (user['id'], song_id, song_name, song_artist, song_album, song_cover, song_duration)
    )
    g.db.commit()
    
    return success_response(message='记录成功')

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    """清空播放历史"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    g.db.execute('DELETE FROM play_history WHERE user_id = ?', (user['id'],))
    g.db.commit()
    
    return success_response(message='清空成功')

# ─────────────────────────────────────────────────────
# 数据同步接口
# ─────────────────────────────────────────────────────

@app.route('/api/sync', methods=['POST'])
def sync_data():
    """同步用户数据"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    data = request.get_json()
    playlists = data.get('playlists', [])
    favorites = data.get('favorites', [])
    history = data.get('history', [])
    
    # 同步歌单
    for playlist in playlists:
        if playlist.get('id'):
            g.db.execute(
                'UPDATE playlists SET name = ?, song_count = ? WHERE id = ? AND user_id = ?',
                (playlist['name'], playlist.get('song_count', 0), playlist['id'], user['id'])
            )
        else:
            cursor = g.db.execute(
                'INSERT INTO playlists (user_id, name, song_count) VALUES (?, ?, ?)',
                (user['id'], playlist['name'], playlist.get('song_count', 0))
            )
            playlist_id = cursor.lastrowid
            
            for i, song in enumerate(playlist.get('songs', [])):
                g.db.execute(
                    '''INSERT INTO playlist_songs 
                       (playlist_id, song_id, song_name, song_artist, song_album, song_cover, song_duration, position)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (playlist_id, song['id'], song['name'], song['artist'], 
                     song.get('album', ''), song.get('cover', ''), song.get('duration', 0), i)
                )
    
    # 同步收藏
    for song in favorites:
        g.db.execute(
            'DELETE FROM favorites WHERE user_id = ? AND song_id = ?', (user['id'], song['id'])
        )
        g.db.execute(
            '''INSERT INTO favorites 
               (user_id, song_id, song_name, song_artist, song_album, song_cover, song_duration)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user['id'], song['id'], song['name'], song['artist'],
             song.get('album', ''), song.get('cover', ''), song.get('duration', 0))
        )
    
    g.db.commit()
    
    return success_response(message='同步成功')

@app.route('/api/sync', methods=['GET'])
def get_sync_data():
    """获取同步数据"""
    user = get_current_user()
    if not user:
        return error_response('未登录', 401)
    
    playlists = g.db.execute(
        'SELECT * FROM playlists WHERE user_id = ?',
        (user['id'],)
    ).fetchall()
    
    playlists_data = []
    for p in playlists:
        p_dict = dict(p)
        songs = g.db.execute(
            'SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY position',
            (p['id'],)
        ).fetchall()
        p_dict['songs'] = [dict(s) for s in songs]
        playlists_data.append(p_dict)
    
    favorites = g.db.execute(
        'SELECT * FROM favorites WHERE user_id = ? ORDER BY added_at DESC',
        (user['id'],)
    ).fetchall()
    
    history = g.db.execute(
        'SELECT * FROM play_history WHERE user_id = ? ORDER BY played_at DESC LIMIT 100',
        (user['id'],)
    ).fetchall()
    
    return success_response({
        'playlists': playlists_data,
        'favorites': [dict(f) for f in favorites],
        'history': [dict(h) for h in history]
    })

# ─────────────────────────────────────────────────────
# 健康检查
# ─────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return success_response({'status': 'ok', 'timestamp': datetime.now().isoformat()})

# ─────────────────────────────────────────────────────
# 错误处理
# ─────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return error_response('接口不存在', 404)

@app.errorhandler(500)
def internal_error(e):
    return error_response('服务器错误', 500)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

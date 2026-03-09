import os
import sys

# 添加 backend 目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db

if __name__ == '__main__':
    print("正在初始化数据库...")
    init_db()
    print("数据库初始化完成！")
    print(f"数据库文件位置: {os.path.abspath('sky_music.db')}")

"""
配置管理模块 - 从环境变量读取支付宝配置
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()


class Config:
    """支付宝配置类"""

    # 支付宝应用配置
    ALIPAY_APP_ID = os.getenv('ALIPAY_APP_ID', '2021006135645372')

    # 支付宝服务器地址 (生产环境)
    ALIPAY_SERVER_URL = os.getenv(
        'ALIPAY_SERVER_URL',
        'https://openapi.alipay.com/gateway.do'
    )

    # 授权回调地址
    ALIPAY_REDIRECT_URI = os.getenv(
        'ALIPAY_REDIRECT_URI',
        'http://localhost:5000/api/auth/callback'
    )

    # 授权 scopes
    ALIPAY_SCOPE = os.getenv('ALIPAY_SCOPE', 'auth_base')

    # 调试模式
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    @classmethod
    def load_private_key(cls) -> str:
        """从文件加载应用私钥"""
        key_path = os.getenv('ALIPAY_PRIVATE_KEY_PATH')
        if key_path and Path(key_path).exists():
            with open(key_path, 'r', encoding='utf-8') as f:
                return f.read().strip()

        # 备用：从环境变量直接读取
        return os.getenv('ALIPAY_PRIVATE_KEY', '')

    @classmethod
    def load_public_key(cls) -> str:
        """从文件加载支付宝公钥"""
        key_path = os.getenv('ALIPAY_PUBLIC_KEY_PATH')
        if key_path and Path(key_path).exists():
            with open(key_path, 'r', encoding='utf-8') as f:
                return f.read().strip()

        # 备用：从环境变量直接读取
        return os.getenv('ALIPAY_PUBLIC_KEY', '')


# 便捷访问
config = Config()

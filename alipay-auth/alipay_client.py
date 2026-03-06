"""
支付宝客户端封装模块
"""
from alipay.aop.api.AlipayClientConfig import AlipayClientConfig
from alipay.aop.api.DefaultAlipayClient import DefaultAlipayClient

from config import config


def create_alipay_client() -> DefaultAlipayClient:
    """
    创建支付宝客户端实例

    Returns:
        DefaultAlipayClient: 支付宝客户端实例
    """
    # 创建客户端配置
    alipay_client_config = AlipayClientConfig()
    alipay_client_config.server_url = config.ALIPAY_SERVER_URL
    alipay_client_config.app_id = config.ALIPAY_APP_ID
    alipay_client_config.app_private_key = config.load_private_key()
    alipay_client_config.alipay_public_key = config.load_public_key()

    # 创建客户端
    client = DefaultAlipayClient(alipay_client_config)

    return client


# 全局客户端实例
alipay_client = create_alipay_client()

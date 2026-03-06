"""
授权处理模块
"""
from urllib.parse import urlencode

from alipay.aop.api.request.AlipaySystemOauthTokenRequest import AlipaySystemOauthTokenRequest

from config import config
from alipay_client import alipay_client
from utils.logger import logger


class AuthHandler:
    """支付宝授权处理器"""

    @staticmethod
    def get_authorize_url(state: str = None) -> str:
        """
        获取授权页面 URL

        Args:
            state: 状态参数，用于防止 CSRF 攻击

        Returns:
            str: 授权页面 URL
        """
        # 支付宝授权 URL 构造
        params = {
            'app_id': config.ALIPAY_APP_ID,
            'redirect_uri': config.ALIPAY_REDIRECT_URI,
            'scope': config.ALIPAY_SCOPE,
            'state': state or '',
        }

        # 支付宝新版授权地址
        authorize_url = f"https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?{urlencode(params)}"

        logger.info(f"Generated authorize URL for app_id: {config.ALIPAY_APP_ID}")

        return authorize_url

    @staticmethod
    def exchange_code_for_token(auth_code: str) -> dict:
        """
        使用授权码换取 access_token

        Args:
            auth_code: 用户授权后获得的 code

        Returns:
            dict: 包含 access_token 和其他信息的字典

        Raises:
            Exception: 如果换取 token 失败
        """
        try:
            # 创建请求对象
            request = AlipaySystemOauthTokenRequest()
            request.code = auth_code
            request.grant_type = 'authorization_code'

            # 执行请求
            response = alipay_client.execute(request)

            logger.info(f"Token exchange response: {response}")

            if response and response.get('code') == '10000':
                result = {
                    'success': True,
                    'access_token': response.get('access_token'),
                    'alipay_user_id': response.get('alipay_user_id'),
                    'refresh_token': response.get('refresh_token'),
                    'expires_in': response.get('expires_in'),
                    're_expires_in': response.get('re_expires_in'),
                }
                logger.info(f"Successfully obtained access_token for user: {result.get('alipay_user_id')}")
                return result
            else:
                error_msg = response.get('msg', 'Unknown error') if response else 'No response'
                logger.error(f"Token exchange failed: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                }

        except Exception as e:
            logger.error(f"Exception during token exchange: {str(e)}")
            return {
                'success': False,
                'error': str(e),
            }

    @staticmethod
    def refresh_token(refresh_token: str) -> dict:
        """
        刷新 access_token

        Args:
            refresh_token: 刷新令牌

        Returns:
            dict: 新的令牌信息
        """
        try:
            request = AlipaySystemOauthTokenRequest()
            request.refresh_token = refresh_token
            request.grant_type = 'refresh_token'

            response = alipay_client.execute(request)

            if response and response.get('code') == '10000':
                return {
                    'success': True,
                    'access_token': response.get('access_token'),
                    'alipay_user_id': response.get('alipay_user_id'),
                    'expires_in': response.get('expires_in'),
                }
            else:
                return {
                    'success': False,
                    'error': response.get('msg', 'Unknown error') if response else 'No response',
                }

        except Exception as e:
            logger.error(f"Exception during token refresh: {str(e)}")
            return {
                'success': False,
                'error': str(e),
            }


# 创建全局处理器实例
auth_handler = AuthHandler()

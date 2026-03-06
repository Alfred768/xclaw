"""
支付宝授权云函数 - Flask 应用入口
"""
import uuid
from flask import Flask, request, jsonify, redirect

from config import config
from handlers.auth_handler import auth_handler
from utils.logger import logger

app = Flask(__name__)

# 配置密钥
app.secret_key = config.ALIPAY_APP_ID


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'service': 'alipay-auth',
    })


@app.route('/api/auth/init', methods=['POST'])
def init_auth():
    """
    初始化授权 - 返回授权页面 URL

    请求体:
        {
            "state": "可选的状态参数"
        }

    返回:
        {
            "success": true,
            "authorize_url": "https://openauth.alipay.com/...",
            "state": "状态参数"
        }
    """
    try:
        data = request.get_json() or {}
        state = data.get('state', str(uuid.uuid4()))

        authorize_url = auth_handler.get_authorize_url(state)

        logger.info(f"Init auth request - state: {state}")

        return jsonify({
            'success': True,
            'authorize_url': authorize_url,
            'state': state,
        })

    except Exception as e:
        logger.error(f"Init auth error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


@app.route('/api/auth/callback', methods=['GET'])
def auth_callback():
    """
    支付宝回调处理

    Query 参数:
        - auth_code: 授权码
        - state: 状态参数

    返回:
        重定向到前端页面，携带 token 信息
    """
    auth_code = request.args.get('auth_code')
    state = request.args.get('state', '')

    if not auth_code:
        logger.error("No auth_code in callback")
        return jsonify({
            'success': False,
            'error': 'Missing auth_code',
        }), 400

    logger.info(f"Auth callback - state: {state}, code: {auth_code[:20]}...")

    # 换取 token
    result = auth_handler.exchange_code_for_token(auth_code)

    if result.get('success'):
        # 返回 JSON 格式的 token 信息（前端可以通过 JavaScript 接收）
        return jsonify({
            'success': True,
            'data': {
                'access_token': result.get('access_token'),
                'alipay_user_id': result.get('alipay_user_id'),
                'expires_in': result.get('expires_in'),
            },
            'state': state,
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('error', 'Token exchange failed'),
        }), 400


@app.route('/api/auth/token', methods=['POST'])
def get_token():
    """
    使用 code 换取 token (API 方式)

    请求体:
        {
            "auth_code": "用户授权后获得的 code"
        }

    返回:
        {
            "success": true,
            "access_token": "...",
            "alipay_user_id": "...",
            "expires_in": 3600
        }
    """
    try:
        data = request.get_json() or {}
        auth_code = data.get('auth_code')

        if not auth_code:
            return jsonify({
                'success': False,
                'error': 'Missing auth_code',
            }), 400

        result = auth_handler.exchange_code_for_token(auth_code)

        if result.get('success'):
            return jsonify({
                'success': True,
                'access_token': result.get('access_token'),
                'alipay_user_id': result.get('alipay_user_id'),
                'refresh_token': result.get('refresh_token'),
                'expires_in': result.get('expires_in'),
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Token exchange failed'),
            }), 400

    except Exception as e:
        logger.error(f"Get token error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


@app.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    """
    刷新 access_token

    请求体:
        {
            "refresh_token": "刷新令牌"
        }

    返回:
        {
            "success": true,
            "access_token": "...",
            "expires_in": 3600
        }
    """
    try:
        data = request.get_json() or {}
        refresh_token = data.get('refresh_token')

        if not refresh_token:
            return jsonify({
                'success': False,
                'error': 'Missing refresh_token',
            }), 400

        result = auth_handler.refresh_token(refresh_token)

        if result.get('success'):
            return jsonify({
                'success': True,
                'access_token': result.get('access_token'),
                'alipay_user_id': result.get('alipay_user_id'),
                'expires_in': result.get('expires_in'),
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Token refresh failed'),
            }), 400

    except Exception as e:
        logger.error(f"Refresh token error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
        }), 500


if __name__ == '__main__':
    logger.info("Starting Alipay Auth Service...")
    app.run(host='0.0.0.0', port=5000, debug=config.DEBUG)

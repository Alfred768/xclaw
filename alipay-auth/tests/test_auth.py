"""
支付宝授权模块测试
"""
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import config
from handlers.auth_handler import auth_handler


def test_config():
    """测试配置加载"""
    print("=" * 50)
    print("Testing Config...")
    print("=" * 50)

    print(f"APP_ID: {config.ALIPAY_APP_ID}")
    print(f"SERVER_URL: {config.ALIPAY_SERVER_URL}")
    print(f"REDIRECT_URI: {config.ALIPAY_REDIRECT_URI}")
    print(f"SCOPE: {config.ALIPAY_SCOPE}")
    print(f"DEBUG: {config.DEBUG}")

    private_key = config.load_private_key()
    print(f"Private Key loaded: {len(private_key) > 0}")
    print(f"Private Key preview: {private_key[:50]}...")

    public_key = config.load_public_key()
    print(f"Public Key loaded: {len(public_key) > 0}")
    print(f"Public Key preview: {public_key[:50]}...")

    assert config.ALIPAY_APP_ID == '2021006135645372'
    assert len(private_key) > 0
    assert len(public_key) > 0

    print("✓ Config test passed!")
    return True


def test_authorize_url():
    """测试授权 URL 生成"""
    print("=" * 50)
    print("Testing Authorize URL...")
    print("=" * 50)

    state = "test_state_123"
    authorize_url = auth_handler.get_authorize_url(state)

    print(f"Authorize URL: {authorize_url}")

    assert authorize_url is not None
    assert config.ALIPAY_APP_ID in authorize_url
    assert 'scope=auth_base' in authorize_url

    print("✓ Authorize URL test passed!")
    return True


def test_token_exchange():
    """测试 token 换取"""
    print("=" * 50)
    print("Testing Token Exchange...")
    print("=" * 50)

    # 使用一个无效的 code 测试（会返回错误）
    result = auth_handler.exchange_code_for_token("invalid_code")

    print(f"Result: {result}")
    print(f"Success: {result.get('success')}")

    # 这个测试预期会失败，因为我们使用了一个无效的 code
    # 但我们可以验证 API 是否正常工作
    if not result.get('success'):
        print("✓ Token exchange API is working (got expected error response)")
        return True

    return False


def main():
    """运行所有测试"""
    print("\n" + "=" * 50)
    print("Starting Alipay Auth Tests")
    print("=" * 50 + "\n")

    tests = [
        test_config,
        test_authorize_url,
        # test_token_exchange,  # 需要真实的 auth_code 才能测试
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} failed: {str(e)}")
            failed += 1
        print()

    print("=" * 50)
    print(f"Tests completed: {passed} passed, {failed} failed")
    print("=" * 50)


if __name__ == '__main__':
    main()

"""
日志工具模块
"""
import logging
import sys
from config import config


def setup_logger(name: str = __name__) -> logging.Logger:
    """
    设置日志记录器

    Args:
        name: 日志记录器名称

    Returns:
        logging.Logger: 配置好的日志记录器
    """
    logger = logging.getLogger(name)

    # 避免重复配置
    if logger.handlers:
        return logger

    # 设置日志级别
    level = logging.DEBUG if config.DEBUG else logging.INFO
    logger.setLevel(level)

    # 创建控制台处理器
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    # 设置日志格式
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)

    # 添加处理器
    logger.addHandler(handler)

    return logger


# 创建默认日志记录器
logger = setup_logger()

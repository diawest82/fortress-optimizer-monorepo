"""Package configuration for fortress-langchain."""

from setuptools import setup, find_packages

setup(
    name="fortress-langchain",
    version="0.1.0",
    description="LangChain integration for the Fortress Token Optimizer",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Fortress Optimizer LLC",
    author_email="support@fortress-optimizer.com",
    url="https://github.com/fortress-optimizer/fortress-langchain",
    packages=find_packages(exclude=["tests", "tests.*"]),
    python_requires=">=3.9",
    install_requires=[
        "langchain-core>=0.1.0",
        "httpx>=0.24.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-asyncio>=0.21",
            "pytest-httpx>=0.21",
            "respx>=0.20",
            "langchain-openai>=0.0.5",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="langchain llm token optimization fortress prompt compression",
    license="MIT",
)

from setuptools import setup, find_packages

setup(
    name="fortress-anthropic",
    version="0.1.0",
    description="Fortress Token Optimizer wrapper for Anthropic SDK",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Fortress Optimizer LLC",
    license="MIT",
    python_requires=">=3.8",
    install_requires=[
        "anthropic",
        "httpx",
    ],
    py_modules=["wrapper"],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)

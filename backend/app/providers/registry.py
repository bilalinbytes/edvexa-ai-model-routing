from typing import Dict, Type, Any
from app.providers.base import BaseProvider
from app.providers.mock_providers import (
    MockFastLlamaProvider,
    MockDeepReasonerProvider,
    MockFlakyEdgeProvider
)

class ProviderRegistry:
    _registry: Dict[str, Type[BaseProvider]] = {
        "mock-fast-llama": MockFastLlamaProvider,
        "mock-deep-reasoner": MockDeepReasonerProvider,
        "mock-flaky-edge": MockFlakyEdgeProvider,
    }

    @classmethod
    def register(cls, identifier: str, provider_class: Type[BaseProvider]):
        cls._registry[identifier] = provider_class

    @classmethod
    def get_provider(cls, config_dict: Dict[str, Any]) -> BaseProvider:
        identifier = config_dict.get("identifier", "")
        # Match by identifier first
        if identifier in cls._registry:
            return cls._registry[identifier](config_dict)
        
        # Match by model_identifier or provider_type
        model_id = config_dict.get("model_identifier", "")
        if model_id in cls._registry:
            return cls._registry[model_id](config_dict)
            
        provider_type = config_dict.get("provider_type", "")
        if provider_type == "mock_fast":
            return MockFastLlamaProvider(config_dict)
        elif provider_type == "mock_reasoner":
            return MockDeepReasonerProvider(config_dict)
        elif provider_type == "mock_flaky":
            return MockFlakyEdgeProvider(config_dict)
            
        # Default mock fallback
        return MockFastLlamaProvider(config_dict)

    @classmethod
    def list_available_identifiers(cls):
        return list(cls._registry.keys())

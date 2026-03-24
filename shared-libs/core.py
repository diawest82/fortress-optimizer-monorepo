"""
Fortress Token Optimizer - Core Algorithm

PROTECTED IP: This algorithm never leaves the backend.
Clients call /api/optimize endpoint and receive results only.
"""

from dataclasses import dataclass
from typing import List, Dict, Tuple
import re


@dataclass
class OptimizationResult:
    """Result of token optimization"""
    original_prompt: str
    optimized_prompt: str
    original_tokens: int
    optimized_tokens: int
    savings: int
    savings_percentage: float
    technique_used: str


class TokenOptimizer:
    """
    Token optimization engine using:
    - Meta-instruction removal (LLMs don't need politeness)
    - Verbose phrase compression (wordy → concise)
    - Redundant modifier pruning (very detailed and comprehensive → detailed)
    - Duplicate instruction detection
    - Filler and hedge word removal
    - Semantic deduplication (sentence-level)
    - Provider-aware optimization
    """

    # ═══ Tier 1: Verbose phrase patterns (pure regex, high ROI) ═══

    META_INSTRUCTIONS = [
        # Politeness prefix removal — LLMs don't need these
        (r"\bI would like you to\s*", ""),
        (r"\bCan you (please )?\s*", ""),
        (r"\bCould you (please )?\s*", ""),
        (r"\bWould you (please |be able to )?\s*", ""),
        (r"\bI want you to\s*", ""),
        (r"\bI need you to\s*", ""),
        (r"\bI('d| would) like to ask you to\s*", ""),
        (r"\bPlease help me (with |to )?\s*", ""),
        (r"\bI('m| am) looking for (help |assistance )(with |to )?\s*", ""),
        (r"\bHelp me (to )?\s*", ""),
        (r"\bI was wondering if you could\s*", ""),
        (r"\bIt would be great if you could\s*", ""),
    ]

    VERBOSE_PHRASES = [
        # Wordy → concise replacements
        (r"\bvery detailed and comprehensive\b", "detailed"),
        (r"\bvery detailed and thorough\b", "detailed"),
        (r"\bcomprehensive and detailed\b", "detailed"),
        (r"\bdetailed and comprehensive\b", "detailed"),
        (r"\bthorough and exhaustive\b", "thorough"),
        (r"\bcomprehensive and thorough\b", "thorough"),
        (r"\bdetailed and thorough\b", "detailed"),
        (r"\bextensive and comprehensive\b", "comprehensive"),
        (r"\bhighly detailed\b", "detailed"),
        (r"\bvery specific\b", "specific"),
        (r"\bvery important\b", "important"),
        (r"\bvery clear\b", "clear"),
        (r"\bvery thorough\b", "thorough"),
        (r"\ball of the\b", "all"),
        (r"\beach and every\b", "every"),
        (r"\bany and all\b", "all"),
        (r"\bfirst and foremost\b", "first"),
        (r"\bone and only\b", "only"),
        (r"\bin the event that\b", "if"),
        (r"\bat this point in time\b", "now"),
        (r"\bat the present time\b", "now"),
        (r"\bat this time\b", "now"),
        (r"\bdue to the fact that\b", "because"),
        (r"\bin spite of the fact that\b", "despite"),
        (r"\bfor the purpose of\b", "for"),
        (r"\bwith regard to\b", "regarding"),
        (r"\bwith respect to\b", "regarding"),
        (r"\bin regard to\b", "regarding"),
        (r"\bin terms of\b", "in"),
        (r"\bon a daily basis\b", "daily"),
        (r"\bon a regular basis\b", "regularly"),
        (r"\bin a timely manner\b", "promptly"),
        (r"\bin a way that is\b", "that is"),
        (r"\bin order to\b", "to"),
        (r"\bso as to\b", "to"),
        (r"\bwith the aim of\b", "to"),
        (r"\bfor the sake of\b", "for"),
        (r"\bas a result of\b", "from"),
        (r"\ba large number of\b", "many"),
        (r"\ba significant amount of\b", "much"),
        (r"\ba wide variety of\b", "various"),
        (r"\ba wide range of\b", "various"),
        (r"\bin the near future\b", "soon"),
        (r"\bas soon as possible\b", "ASAP"),
        (r"\bat the end of the day\b", "ultimately"),
        (r"\bthe fact that\b", "that"),
        (r"\bit is important to note that\b", "notably"),
        (r"\bit should be noted that\b", ""),
        (r"\bit is worth mentioning that\b", ""),
        (r"\bneedless to say\b", ""),
        (r"\bwithout a doubt\b", ""),
        (r"\bas a matter of fact\b", ""),
    ]

    REDUNDANT_INSTRUCTIONS = [
        # Instructions that add no value — LLMs already do these
        (r"\bMake sure (to |that )?\s*", ""),
        (r"\bBe sure (to |that )?\s*", ""),
        (r"\bPlease ensure (that )?\s*", ""),
        (r"\bPlease make sure (that )?\s*", ""),
        (r"\bEnsure that you\s*", ""),
        (r"\bMake certain (that )?\s*", ""),
        (r"\bDo not forget to\s*", ""),
        (r"\bRemember to\s*", ""),
        (r"\bKeep in mind (that )?\s*", ""),
        (r"\bPlease note (that )?\s*", ""),
        (r"\bIt is essential (that |to )?\s*", ""),
        (r"\bIt is crucial (that |to )?\s*", ""),
        (r"\bIt is necessary (that |to )?\s*", ""),
    ]

    HEDGE_WORDS = [
        # Written hedging — adds tokens but no meaning
        (r"\bI think (that |maybe )?\s*", ""),
        (r"\bI believe (that )?\s*", ""),
        (r"\bI feel like\s*", ""),
        (r"\bbasically,?\s*", ""),
        (r"\bessentially,?\s*", ""),
        (r"\bfundamentally,?\s*", ""),
        (r"(?:^|(?<=\.\s))Obviously,?\s*", ""),
        (r"(?:^|(?<=\.\s))Clearly,?\s*", ""),
        (r"(?:^|(?<=\.\s))Actually,?\s*", ""),
        (r"\breally\s+(?=\w)", ""),
        (r"\bjust\s+(?=\w)", ""),
        (r"\bsimply\s+(?=\w)", ""),
        (r"\bquite\s+(?=\w)", ""),
        (r"\brather\s+(?=\w)", ""),
        (r"\bsomewhat\s+(?=\w)", ""),
    ]

    SPOKEN_FILLERS = [
        # Spoken fillers (original patterns)
        (r"\b(um|uh|like|you know)\b,?\s*", ""),
    ]

    # ═══ Tier 2: Sentence-level patterns (lightweight NLP) ═══

    SENTENCE_START_BLOAT = [
        # "Please X" at sentence start — LLMs don't need please
        (r'(?:^|\.\s+)Please\s+', lambda m: m.group(0).replace('Please ', '').lstrip()),
        # "I want to" / "I need to" at start
        (r'(?:^|\.\s+)I\s+want\s+to\s+', lambda m: m.group(0).replace('I want to ', '')),
        (r'(?:^|\.\s+)I\s+need\s+to\s+', lambda m: m.group(0).replace('I need to ', '')),
    ]

    REDUNDANT_QUALIFIERS = [
        # When "detailed" already appears, remove later synonyms
        # These are applied context-aware (only if earlier qualifier exists)
        "thorough", "comprehensive", "exhaustive", "extensive", "in-depth", "complete",
    ]

    COMBINABLE_PATTERNS = [
        # "Check for X. Check for Y. Check for Z." → "Check for X, Y, and Z."
        # Detected and merged in _merge_parallel_sentences()
    ]

    def __init__(self, provider: str = "openai"):
        self.provider = provider
        self.semantic_threshold = 0.85
        self.dedup_patterns = self._build_dedup_patterns()

    def _build_dedup_patterns(self) -> Dict[str, str]:
        """Build regex patterns for structural redundancies"""
        return {
            "repeated_words": r"\b(\w+)(\s+\1)+\b",
            "extra_spaces": r"\s+",
            "repeated_punctuation": r"\.{2,}|!{2,}|\?{2,}",
        }

    def optimize(
        self,
        prompt: str,
        level: str = "balanced",
        context_window: int = 8000,
    ) -> OptimizationResult:
        """
        Optimize a prompt for token efficiency

        Args:
            prompt: The prompt to optimize
            level: 'conservative', 'balanced', or 'aggressive'
            context_window: Model's context window size

        Returns:
            OptimizationResult with optimization details
        """
        original_tokens = self.estimate_tokens(prompt)

        # Apply optimization techniques based on level
        optimized = prompt
        techniques = []

        # Conservative: light touch — only verbose phrases + whitespace
        if level in ["conservative", "balanced", "aggressive"]:
            for pattern, replacement in self.VERBOSE_PHRASES:
                optimized = re.sub(pattern, replacement, optimized, flags=re.IGNORECASE)
            techniques.append("phrase-compression")

        # Balanced: + deduplication + hedge removal + meta-instruction removal
        if level in ["balanced", "aggressive"]:
            optimized, dedup_tech = self._deduplicate(optimized)
            techniques.append(dedup_tech)
            # Also apply meta-instruction removal at balanced level
            for pattern, replacement in self.META_INSTRUCTIONS:
                optimized = re.sub(pattern, replacement, optimized, flags=re.IGNORECASE)
            techniques.append("meta-removal")

            # Tier 2: Sentence-level optimizations
            optimized = self._remove_sentence_bloat(optimized)
            optimized = self._remove_redundant_qualifiers(optimized)
            optimized = self._merge_parallel_sentences(optimized)
            techniques.append("sentence-optimization")

        # Aggressive: + full compression + redundant instruction removal
        if level == "aggressive":
            optimized, comp_technique = self._compress_context(optimized)
            techniques.append(comp_technique)

        # Clean up — always
        optimized = self._normalize_whitespace(optimized)

        # Fix capitalization after removal (sentence start)
        optimized = re.sub(r'(?:^|\.\s+)([a-z])', lambda m: m.group(0).upper(), optimized)

        technique = "+".join(filter(None, techniques))

        optimized_tokens = self.estimate_tokens(optimized)
        savings = original_tokens - optimized_tokens
        savings_percentage = (savings / original_tokens * 100) if original_tokens > 0 else 0

        return OptimizationResult(
            original_prompt=prompt,
            optimized_prompt=optimized,
            original_tokens=original_tokens,
            optimized_tokens=optimized_tokens,
            savings=savings,
            savings_percentage=savings_percentage,
            technique_used=technique,
        )

    def _deduplicate(self, text: str) -> Tuple[str, str]:
        """Remove redundant information — structural + semantic"""
        techniques = []

        # 1. Remove repeated words (case-insensitive)
        text = re.sub(self.dedup_patterns["repeated_words"], r"\1", text, flags=re.IGNORECASE)

        # 2. Remove spoken fillers
        for pattern, replacement in self.SPOKEN_FILLERS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

        # 3. Remove hedge words (written fillers)
        for pattern, replacement in self.HEDGE_WORDS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        techniques.append("deduplication")

        # 4. Sentence-level deduplication (remove near-duplicate sentences)
        text = self._deduplicate_sentences(text)

        return text, "+".join(techniques)

    def _deduplicate_sentences(self, text: str) -> str:
        """Remove sentences that are near-duplicates of earlier sentences"""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if len(sentences) <= 1:
            return text

        kept = []
        seen_normalized = set()

        for sentence in sentences:
            # Normalize: lowercase, strip punctuation, collapse spaces
            normalized = re.sub(r'[^\w\s]', '', sentence.lower()).strip()
            normalized = re.sub(r'\s+', ' ', normalized)
            words = set(normalized.split())

            # Check overlap with previously seen sentences
            is_duplicate = False
            for seen_words in seen_normalized:
                if len(words) > 3 and len(seen_words) > 3:
                    overlap = len(words & seen_words) / max(len(words), len(seen_words))
                    if overlap > self.semantic_threshold:
                        is_duplicate = True
                        break

            if not is_duplicate:
                kept.append(sentence)
                seen_normalized.add(frozenset(words))

        return ' '.join(kept)

    def _compress_context(self, text: str) -> Tuple[str, str]:
        """Compress context while maintaining meaning"""
        techniques = []

        # 1. Remove meta-instructions (LLMs don't need politeness)
        for pattern, replacement in self.META_INSTRUCTIONS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        techniques.append("meta-removal")

        # 2. Compress verbose phrases
        for pattern, replacement in self.VERBOSE_PHRASES:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        techniques.append("compression")

        # 3. Remove redundant instructions
        for pattern, replacement in self.REDUNDANT_INSTRUCTIONS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        techniques.append("instruction-cleanup")

        # 4. Remove extra punctuation
        text = re.sub(self.dedup_patterns["repeated_punctuation"], ".", text)

        return text, "+".join(techniques)

    # ═══ Tier 2: Sentence-level optimization methods ═══

    def _remove_sentence_bloat(self, text: str) -> str:
        """Remove bloat at sentence starts — 'Please X' → 'X'"""
        # Remove "Please" at sentence boundaries
        text = re.sub(r'(?<=[.!?]\s)Please\s+', '', text)
        text = re.sub(r'^Please\s+', '', text)

        # Remove "I want to" / "I need to" at sentence start
        text = re.sub(r'(?<=[.!?]\s)I\s+(?:want|need)\s+to\s+', '', text)
        text = re.sub(r'^I\s+(?:want|need)\s+to\s+', '', text)

        # Remove "Also" / "Additionally" when they add no info
        text = re.sub(r'(?<=[.!?]\s)(?:Also|Additionally|Furthermore|Moreover),?\s+', '', text)

        return text

    def _remove_redundant_qualifiers(self, text: str) -> str:
        """If 'detailed' appears early, remove later 'thorough', 'comprehensive', etc."""
        text_lower = text.lower()

        # Check which qualifiers appear
        has_detailed = 'detailed' in text_lower
        has_comprehensive = 'comprehensive' in text_lower
        has_thorough = 'thorough' in text_lower

        if has_detailed:
            # Remove later occurrences of synonyms (keep first, remove rest)
            first_detailed = text_lower.find('detailed')
            for qualifier in self.REDUNDANT_QUALIFIERS:
                if qualifier == 'detailed':
                    continue
                # Find occurrences AFTER the first "detailed"
                pattern = re.compile(r'\b' + qualifier + r'\b', re.IGNORECASE)
                matches = list(pattern.finditer(text))
                for match in reversed(matches):
                    if match.start() > first_detailed:
                        # Remove this qualifier and surrounding "and" if present
                        start = match.start()
                        end = match.end()
                        # Check for " and <qualifier>" or "<qualifier> and "
                        before = text[max(0, start-5):start]
                        after = text[end:min(len(text), end+5)]
                        if before.rstrip().endswith('and'):
                            start = start - len(before) + before.rstrip().rfind('and')
                        elif after.lstrip().startswith('and'):
                            end = end + after.lstrip().find('and') + 3
                        text = text[:start].rstrip() + ' ' + text[end:].lstrip()

        return text

    def _merge_parallel_sentences(self, text: str) -> str:
        """
        Merge parallel sentences:
        'Check for X. Check for Y. Check for Z.' → 'Check for X, Y, and Z.'
        'Include A. Include B.' → 'Include A and B.'
        """
        sentences = re.split(r'(?<=[.!?])\s+', text)
        if len(sentences) <= 1:
            return text

        merged = []
        i = 0
        while i < len(sentences):
            sentence = sentences[i]

            # Look for parallel structure: same start, different end
            if i + 1 < len(sentences):
                # Extract first 3 words as the "verb phrase"
                words_current = sentence.split()
                words_next = sentences[i + 1].split()

                if len(words_current) >= 3 and len(words_next) >= 3:
                    prefix_current = ' '.join(words_current[:2]).lower().rstrip('.,!?')
                    prefix_next = ' '.join(words_next[:2]).lower().rstrip('.,!?')

                    if prefix_current == prefix_next and len(prefix_current) > 5:
                        # Found parallel sentences — collect all with same prefix
                        group = [sentence.rstrip('.!? ')]
                        j = i + 1
                        while j < len(sentences):
                            wj = sentences[j].split()
                            if len(wj) >= 3 and ' '.join(wj[:2]).lower().rstrip('.,!?') == prefix_current:
                                # Extract the part after the shared prefix
                                rest = ' '.join(wj[2:]).rstrip('.!? ')
                                group.append(rest)
                                j += 1
                            else:
                                break

                        if len(group) > 1:
                            # Merge: "Check for bugs" + "security issues" + "performance"
                            base = group[0]
                            extras = group[1:]
                            if len(extras) == 1:
                                merged_sentence = f"{base} and {extras[0]}."
                            else:
                                merged_sentence = f"{base}, {', '.join(extras[:-1])}, and {extras[-1]}."
                            merged.append(merged_sentence)
                            i = j
                            continue

            merged.append(sentence)
            i += 1

        return ' '.join(merged)

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize spaces, fix dangling fragments, clean punctuation"""
        # Fix dangling "I to" from meta-instruction removal
        text = re.sub(r'\bI\s+to\b', '', text)

        # Fix broken sentences from qualifier removal
        text = re.sub(r'\bto be in\b', 'in', text)
        text = re.sub(r'\bMake sure in\b', 'Ensure depth in', text)
        text = re.sub(r'\bBe sure in\b', 'Focus on depth in', text)
        # Fix "to be" followed by "in/for/with" (dangling from removal)
        text = re.sub(r'\bto be\s+(in|for|with|of)\b', r'\1', text)

        # Fix double spaces
        text = re.sub(r'\s+', ' ', text)

        # Fix space before punctuation
        text = re.sub(r'\s+([.,!?;:])', r'\1', text)

        # Fix empty sentences ("." with nothing before)
        text = re.sub(r'(?:^|\.\s*)\.\s*', '. ', text)

        # Fix leading punctuation
        text = re.sub(r'^\s*[.,;:]\s*', '', text)

        # Remove leading "to " at sentence start (from incomplete removal)
        text = re.sub(r'(?:^|\.\s+)to\s+', lambda m: m.group(0).replace('to ', '') if m.group(0).startswith('.') else '', text)

        text = text.strip()
        return text

    def estimate_tokens(self, text: str) -> int:
        """
        Count tokens using tiktoken (OpenAI's tokenizer) for accuracy.
        Falls back to character estimate if tiktoken unavailable.
        """
        try:
            import tiktoken
            enc = tiktoken.encoding_for_model("gpt-4")
            return len(enc.encode(text))
        except ImportError:
            # Fallback: 1 token ≈ 4 characters
            return len(text) // 4

    def batch_optimize(
        self, prompts: List[str], level: str = "balanced"
    ) -> List[OptimizationResult]:
        """Optimize multiple prompts"""
        return [self.optimize(prompt, level) for prompt in prompts]

    def get_stats(self) -> Dict:
        """Get optimizer statistics"""
        return {
            "provider": self.provider,
            "semantic_threshold": self.semantic_threshold,
            "patterns_count": len(self.dedup_patterns),
        }

"""Test harness shim.

The contract module does `from genlayer import *` and defines a `gl.Contract`
subclass with `u256` / `TreeMap` annotations and `@gl.public.*` decorators.
None of that runtime exists outside GenVM, so we inject a minimal fake
`genlayer` module into sys.modules. This lets us import the REAL contract file
and unit-test its pure logic (`_normalize`, the deterministic score, the
validator invariant) directly — no duplication.
"""
import sys
import types
import importlib.util
from pathlib import Path


def _install_fake_genlayer():
    m = types.ModuleType("genlayer")

    def passthrough(fn=None, **_kw):
        # supports @gl.public.write and @gl.public.write(...) and bare decorator
        if fn is None:
            return lambda f: f
        return fn

    class _Public:
        write = staticmethod(passthrough)
        view = staticmethod(passthrough)

    class _Return:
        def __init__(self, calldata):
            self.calldata = calldata

    class _VM:
        Return = _Return
        @staticmethod
        def run_nondet_unsafe(leader_fn, validator_fn):
            return leader_fn()

    class _Msg:
        sender_address = "0x0000000000000000000000000000000000000000"

    class _Nondet:
        @staticmethod
        def exec_prompt(*_a, **_k):
            return "{}"

    class _GL:
        public = _Public()
        vm = _VM()
        message = _Msg()
        nondet = _Nondet()

        class Contract:  # base class
            pass

    class _U256(int):
        def __new__(cls, v=0):
            return int.__new__(cls, int(v))

    class _TreeMap(dict):
        def __class_getitem__(cls, _item):
            return cls

    m.gl = _GL()
    m.u256 = _U256
    m.i256 = _U256
    m.bigint = int
    m.TreeMap = _TreeMap
    m.DynArray = list
    m.Address = str
    m.allow_storage = passthrough
    sys.modules["genlayer"] = m


_install_fake_genlayer()

# import the real contract module
_CONTRACT = Path(__file__).resolve().parents[1] / "audit" / "audit_lens.py"
_spec = importlib.util.spec_from_file_location("audit_lens", _CONTRACT)
audit_lens = importlib.util.module_from_spec(_spec)
sys.modules["audit_lens"] = audit_lens
_spec.loader.exec_module(audit_lens)

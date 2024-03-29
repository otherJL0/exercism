import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.159.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.159.0/testing/bdd.ts";
import { decode, encode } from "./variable-length-quantity.ts";

describe("VariableLengthQuantity", () => {
  describe("Encode a series of integers, producing a series of bytes.", () => {
    it("zero", () => {
      assertEquals(encode([0]), [0]);
    });

    it("arbitrary single byte", () => {
      assertEquals(encode([0x40]), [0x40]);
    });

    it("largest single byte", () => {
      assertEquals(encode([0x7f]), [0x7f]);
    });

    it.ignore("smallest double byte", () => {
      assertEquals(encode([0x80]), [0x81, 0]);
    });

    it("arbitrary double byte", () => {
      assertEquals(encode([0x2000]), [0xc0, 0]);
    });

    it.ignore("largest double byte", () => {
      assertEquals(encode([0x3fff]), [0xff, 0x7f]);
    });

    it.ignore("smallest triple byte", () => {
      assertEquals(encode([0x4000]), [0x81, 0x80, 0]);
    });

    it.ignore("arbitrary triple byte", () => {
      assertEquals(encode([0x100000]), [0xc0, 0x80, 0]);
    });

    it.ignore("largest triple byte", () => {
      assertEquals(encode([0x1fffff]), [0xff, 0xff, 0x7f]);
    });

    it.ignore("smallest quadruple byte", () => {
      assertEquals(encode([0x200000]), [0x81, 0x80, 0x80, 0]);
    });

    it.ignore("arbitrary quadruple byte", () => {
      assertEquals(encode([0x8000000]), [0xc0, 0x80, 0x80, 0]);
    });

    it.ignore("largest quadruple byte", () => {
      assertEquals(encode([0xfffffff]), [0xff, 0xff, 0xff, 0x7f]);
    });

    it.ignore("smallest quintuple byte", () => {
      assertEquals(encode([0x10000000]), [0x81, 0x80, 0x80, 0x80, 0]);
    });

    it.ignore("arbitrary quintuple byte", () => {
      assertEquals(encode([0xff000000]), [0x8f, 0xf8, 0x80, 0x80, 0]);
    });

    it.ignore("maximum 32-bit integer input", () => {
      assertEquals(encode([0xffffffff]), [0x8f, 0xff, 0xff, 0xff, 0x7f]);
    });

    it.ignore("two single-byte values", () => {
      assertEquals(encode([0x40, 0x7f]), [0x40, 0x7f]);
    });

    it.ignore("two multi-byte values", () => {
      assertEquals(encode([0x4000, 0x123456]), [
        0x81,
        0x80,
        0,
        0xc8,
        0xe8,
        0x56,
      ]);
    });

    it.ignore("many multi-byte values", () => {
      const input = [0x2000, 0x123456, 0xfffffff, 0, 0x3fff, 0x4000];
      const expected = [
        0xc0,
        0,
        0xc8,
        0xe8,
        0x56,
        0xff,
        0xff,
        0xff,
        0x7f,
        0,
        0xff,
        0x7f,
        0x81,
        0x80,
        0,
      ];
      assertEquals(encode(input), expected);
    });
  });

  describe("Decode a series of bytes, producing a series of integers.", () => {
    it.ignore("one byte", () => {
      assertEquals(decode([0x7f]), [0x7f]);
    });

    it.ignore("two bytes", () => {
      assertEquals(decode([0xc0, 0]), [0x2000]);
    });

    it.ignore("three bytes", () => {
      assertEquals(decode([0xff, 0xff, 0x7f]), [0x1fffff]);
    });

    it.ignore("four bytes", () => {
      assertEquals(decode([0x81, 0x80, 0x80, 0]), [0x200000]);
    });

    it.ignore("maximum 32-bit integer", () => {
      assertEquals(decode([0x8f, 0xff, 0xff, 0xff, 0x7f]), [0xffffffff]);
    });

    it.ignore("incomplete sequence causes error", () => {
      assertThrows(() => {
        decode([0xff]);
      }, "Incomplete sequence");
    });

    it.ignore("incomplete sequence causes error, even if value is zero", () => {
      assertThrows(() => {
        decode([0x80]);
      }, "Incomplete sequence");
    });

    it.ignore("multiple values", () => {
      const input = [
        0xc0,
        0,
        0xc8,
        0xe8,
        0x56,
        0xff,
        0xff,
        0xff,
        0x7f,
        0,
        0xff,
        0x7f,
        0x81,
        0x80,
        0,
      ];
      const expected = [0x2000, 0x123456, 0xfffffff, 0, 0x3fff, 0x4000];
      assertEquals(decode(input), expected);
    });
  });
});

import { collectionImageSizes, toCloudinarySrcSet, toCloudinaryThumb } from "../app/collection/collectionMedia";

describe("Collection responsive media helpers", () => {
    const source = "https://res.cloudinary.com/demo/image/upload/v1/banmao/cat.png";

    test("builds auto-format thumbnails at the requested square width", () => {
        expect(toCloudinaryThumb(source, 400)).toBe(
            "https://res.cloudinary.com/demo/image/upload/c_fill,w_400,h_400,dpr_auto,f_auto,q_auto:eco/v1/banmao/cat.png",
        );
    });

    test("does not double-transform an existing Cloudinary delivery URL", () => {
        const transformed = "https://res.cloudinary.com/demo/image/upload/c_limit,w_900,q_auto/v1/banmao/cat.png";
        expect(toCloudinaryThumb(transformed, 400)).toBe(transformed);
        expect(toCloudinarySrcSet(transformed)).toBe("");
    });

    test("leaves non-Cloudinary URLs and GIFs untouched", () => {
        const external = "https://cdn.example.com/cat.png";
        const gif = "https://res.cloudinary.com/demo/image/upload/v1/banmao/cat.gif";
        expect(toCloudinaryThumb(external, 400)).toBe(external);
        expect(toCloudinarySrcSet(external)).toBe("");
        expect(toCloudinaryThumb(gif, 400)).toBe(gif);
        expect(toCloudinarySrcSet(gif)).toBe("");
    });

    test("builds a three-width srcset", () => {
        expect(toCloudinarySrcSet(source)).toBe([
            `${toCloudinaryThumb(source, 200)} 200w`,
            `${toCloudinaryThumb(source, 400)} 400w`,
            `${toCloudinaryThumb(source, 600)} 600w`,
        ].join(", "));
    });

    test("derives responsive sizes from the active grid columns", () => {
        expect(collectionImageSizes(5)).toBe("(max-width: 768px) 33vw, 20vw");
        expect(collectionImageSizes(3)).toBe("(max-width: 768px) 33vw, 34vw");
    });
});

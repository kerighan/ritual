class Link:
    value_type = int
    name = "Link"
    gist = "Link"

    origin = None
    destination = None
    
    def __init__(self, origin, destination):
        import copy

        # get node, pin and value type
        if isinstance(origin, tuple):
            in_, in_pin, in_value_type = origin
        else:
            in_ = origin
            in_pin = 0
            in_value_type = origin.outputs[0].value_type
        # get node, pin and value type
        if isinstance(destination, tuple):
            out_, out_pin, out_value_type = destination
        else:
            out_ = destination
            out_pin = 0
            out_value_type = destination.inputs[0].value_type

        # check types are compatible (but not the RunSlot)
        if out_pin != 0 and out_value_type != "universal":
            try:
                if isinstance(in_value_type, tuple):
                    if isinstance(out_value_type, tuple):
                        assert any([in_type in out_value_type
                                    for in_type in in_value_type])
                    else:
                        assert out_value_type in in_value_type
                elif isinstance(out_value_type, tuple):
                    assert in_value_type in out_value_type
                else:
                    assert out_value_type == in_value_type
            except AssertionError:
                raise AssertionError(
                    f"Incompatible values between {in_.name} and {out_.name}")

        self.in_ = in_
        self.out_ = out_
        out_.inputs = copy.deepcopy(out_.inputs)
        out_.inputs[out_pin].origin = (in_.get_id(), in_pin)

    def to_json(self):
        return {
            "type": str(self.value_type),
            "name": self.name
        }

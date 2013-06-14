var settings = (function () {

var exports = {};

function add_bot_row(name, email, avatar_url, api_key) {
    var avatar_cell;

    if (avatar_url) {
        avatar_cell = '<img src="' + avatar_url + '" height=60 width=60>';
    } else {
        avatar_cell = '(default)';
    }

    var row = $('<tr></tr>').append($('<td>').text(name),
                                    $('<td>').text(email),
                                    $('<td>').html(avatar_cell),
                                    $('<td class="api_key">').text(api_key));
    $('#create_bot_row').before(row);
}

function is_local_part(value, element) {
    // Adapted from Django's EmailValidator
    return this.optional(element) || /^[\-!#$%&'*+\/=?\^_`{}|~0-9A-Z]+(\.[\-!#$%&'*+\/=?\^_`{}|~0-9A-Z]+)*$/i.test(value);
}

$(function () {
    $.ajax({
        type: 'POST',
        url: '/json/get_bots',
        dataType: 'json',
        success: function (data) {
            $('#bot_table_error').hide();

            $.each(data.bots, function (idx, elem) {
                add_bot_row(elem.full_name, elem.username, elem.avatar_url, elem.api_key);
            });
        },
        error: function (xhr, error_type, xhn) {
            $('#bot_table_error').text("Could not fetch bots list").show();
        }
    });

    $.validator.addMethod("bot_local_part",
                          function (value, element) {
                              return is_local_part.call(this, value + "-bot", element);
                          },
                          "Please only use characters that are valid in an email address");

    function clear_bot_avatar_file_input() {
        var control = $('#bot_avatar_file_input');
        var new_control = control.clone(true);
        control.replaceWith(new_control);
    }

    $('#bot_avatar_file_input').change(function(e) {
        if (e.target.files.length === 0) {
            $('#bot_avatar_file_input_error').hide();
        } else if (e.target.files.length === 1) {
            var file = e.target.files[0];
            if (file.size > 5*1024*1024) {
                $('#bot_avatar_file_input_error').text('File size must be < 5Mb.');
                $('#bot_avatar_file_input_error').show();
                clear_bot_avatar_file_input();
            }
            else {
                $('#bot_avatar_file_input_error').hide();
            }
        }
        else {
            $('#bot_avatar_file_input_error').text('Please just upload one file.');
        }
    });

    $('#create_bot_form').validate({
        errorClass: 'text-error',
        success: function () {
            $('#bot_table_error').hide();
        },
        submitHandler: function () {
            var full_name = $('#create_bot_name').val();
            var short_name = $('#create_bot_short_name').val();
            var formData = new FormData();
            formData.append('csrfmiddlewaretoken', csrf_token);
            formData.append('full_name', full_name);
            formData.append('short_name', short_name);
            jQuery.each($('#bot_avatar_file_input')[0].files, function(i, file) {
                formData.append('file-'+i, file);
            });
            util.make_loading_indicator($('#create_bot_spinner'), 'Adding bot');
            $('#create_bot_button').hide();
            $.ajax({
                url: '/json/create_bot',
                type: 'POST',
                data: formData,
                cache: false,
                processData: false,
                contentType: false,
                success: function (data) {
                    util.destroy_loading_indicator($("#create_bot_spinner"));
                    $('#bot_table_error').hide();
                    $('#create_bot_name').val('');
                    $('#create_bot_short_name').val('');
                    $('#create_bot_button').show();
                    clear_bot_avatar_file_input();

                    add_bot_row(
                            full_name,
                            short_name + "-bot@" + page_params.domain,
                            data.avatar_url,
                            data.api_key
                    );
                },
                error: function (xhr, error_type, exn) {
                    util.destroy_loading_indicator($("#create_bot_spinner"));
                    $('#create_bot_button').show();
                    $('#bot_table_error').text(JSON.parse(xhr.responseText).msg).show();
                }
            });
        }
    });
});

}());
